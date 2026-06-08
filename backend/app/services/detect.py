"""Diagram detection service: YOLO shapes/arrows -> DiagramData (Phase 4.2).

The LLM localizes shapes poorly, so a YOLO model trained on hand-drawn flowcharts
(see backend/notebooks/train_flowchart_yolo.ipynb) provides accurate boxes. This
module turns raw YOLO detections into our `DiagramData` (shapes + directed arrows)
so the existing `diagram_to_svg` renderer can draw them at their true positions.

The YOLO model file is expected at backend/models/flowchart.pt. If it (or the
`ultralytics` package) is absent, `detect_available()` returns False and callers
fall back to the cropped-photo embed.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.schemas.notes import Box, DiagramArrow, DiagramData, DiagramShape

_MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "flowchart.pt"
_model = None  # lazy-loaded ultralytics YOLO


# ─── Class name -> our shape vocabulary ───────────────────────────────────────
# The trained model's class names depend on the dataset's unified taxonomy
# (process/decision/terminator/data/arrow/text, or BPMN task/gateway/event/...).
# Map by keyword so we tolerate whichever names the model ends up with.

def classify_kind(name: str) -> str | None:
    """Map a YOLO class name to 'arrow', a shape kind, 'text', or None (ignore)."""
    n = name.lower()
    if any(k in n for k in ("arrow", "flow", "edge", "line", "connection", "transition")):
        return "arrow"
    if any(k in n for k in ("decision", "gateway", "diamond", "rhombus")):
        return "diamond"
    if any(k in n for k in ("terminator", "start", "end", "stadium")):
        return "rounded_box"
    if any(k in n for k in ("event", "state", "circle", "ellipse", "oval", "node")):
        return "circle"
    if any(k in n for k in ("process", "task", "activity", "data", "box", "rectangle",
                            "subprocess", "pool", "lane", "container")):
        return "box"
    if any(k in n for k in ("text", "label", "annotation")):
        return "text"
    return None


@dataclass
class Detection:
    name: str          # raw YOLO class name
    kind: str          # classify_kind result
    box: Box           # normalized 0..1 relative to the detected page/crop
    conf: float


# ─── Arrow direction ──────────────────────────────────────────────────────────

def _center(b: Box) -> tuple[float, float]:
    return b.x + b.w / 2, b.y + b.h / 2


def _arrow_ends(b: Box) -> tuple[tuple[float, float], tuple[float, float]]:
    """Two endpoints of an arrow along its longer axis (start = top/left)."""
    if b.w >= b.h:                       # horizontal-ish
        return (b.x, b.y + b.h / 2), (b.x + b.w, b.y + b.h / 2)
    return (b.x + b.w / 2, b.y), (b.x + b.w / 2, b.y + b.h)  # vertical-ish


def _nearest(point: tuple[float, float], shapes: list[tuple[str, Box]]) -> str | None:
    """Id of the shape whose center is closest to `point`."""
    best_id, best_d = None, float("inf")
    px, py = point
    for sid, b in shapes:
        cx, cy = _center(b)
        d = (cx - px) ** 2 + (cy - py) ** 2
        if d < best_d:
            best_id, best_d = sid, d
    return best_id


def build_diagram_data(detections: list[Detection]) -> DiagramData:
    """Assemble shapes + directed arrows from raw detections.

    Direction is inferred per arrow by matching each end to its nearest shape;
    the start endpoint is the top/left one, so arrows default to reading-order
    direction (a known limitation until we add head/tail keypoints).
    """
    shapes: list[DiagramShape] = []
    shape_lookup: list[tuple[str, Box]] = []
    for i, det in enumerate(d for d in detections if d.kind not in ("arrow", "text", None)):
        sid = f"s{i + 1}"
        shapes.append(DiagramShape(id=sid, kind=det.kind, box=det.box, text="",
                                   color_group=((i % 8) + 1)))
        shape_lookup.append((sid, det.box))

    arrows: list[DiagramArrow] = []
    for det in (d for d in detections if d.kind == "arrow"):
        if len(shape_lookup) < 2:
            break
        start, end = _arrow_ends(det.box)
        from_id = _nearest(start, shape_lookup)
        to_id = _nearest(end, shape_lookup)
        if from_id and to_id and from_id != to_id:
            arrows.append(DiagramArrow(from_id=from_id, to_id=to_id, label=""))

    return DiagramData(shapes=shapes, arrows=arrows)


def is_well_connected(data: DiagramData) -> bool:
    """True if detected arrows connect the shapes well enough to redraw as vectors.

    A connected diagram of n shapes needs ~n-1 arrows. Far fewer means we've missed
    the structure (dense flowchart / weak arrow recall) and should embed the photo
    instead, which preserves every connector.
    """
    return len(data.shapes) >= 2 and len(data.arrows) >= len(data.shapes) - 1


# ─── YOLO inference (requires ultralytics + the trained model) ────────────────

def detect_available() -> bool:
    """True if the trained model file exists and ultralytics is importable."""
    if not _MODEL_PATH.exists():
        return False
    try:
        import ultralytics  # noqa: F401
    except Exception:
        return False
    return True


def _get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        _model = YOLO(str(_MODEL_PATH))
    return _model


def detect(image_bytes: bytes, conf: float = 0.25, imgsz: int = 1024) -> list[Detection]:
    """Run the YOLO model on image bytes -> normalized detections.

    Boxes are normalized 0..1 against the input image so they map directly onto
    the diagram block / page. Returns [] if detection is unavailable.
    """
    if not detect_available():
        return []
    import io

    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    W, H = img.size
    model = _get_model()
    result = model.predict(img, conf=conf, imgsz=imgsz, verbose=False)[0]
    names = result.names

    dets: list[Detection] = []
    for b in result.boxes:
        x1, y1, x2, y2 = (float(v) for v in b.xyxy[0])
        name = names[int(b.cls)]
        kind = classify_kind(name)
        if kind is None:
            continue
        dets.append(Detection(
            name=name, kind=kind,
            box=Box(x=x1 / W, y=y1 / H, w=(x2 - x1) / W, h=(y2 - y1) / H),
            conf=float(b.conf),
        ))
    return dets
