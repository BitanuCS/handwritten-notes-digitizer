"""M0 validation spike: run a hand-drawn flowchart YOLO model on the real photo.

Calls Roboflow's hosted inference API (plain HTTP, like our Groq call) on
`backend/sample_diagram.jpg` and draws every detection onto an overlay PNG so we
can eyeball whether shapes + arrows are localized correctly BEFORE building the
pipeline.

Usage:
    ./.venv/bin/python scripts/yolo_spike.py
Env (read from backend/.env or the shell):
    ROBOFLOW_API_KEY  — required, your private Roboflow key
    ROBOFLOW_MODEL    — "<project>/<version>", e.g. "handwritten-flowchart-part-3/16"
                        (defaults below; override if we pick another model)
"""

import base64
import os
import sys
from pathlib import Path

import httpx
from PIL import Image, ImageDraw, ImageFont

_BACKEND = Path(__file__).resolve().parent.parent
_IMAGE = _BACKEND / "sample_diagram.jpg"
_OVERLAY = _BACKEND / "sample_diagram_overlay.png"
_DEFAULT_MODEL = "handwritten-flowchart-part-3/16"

# Distinct colors per class so shapes vs arrows are easy to tell apart.
_PALETTE = [
    "#e63946", "#2a9d8f", "#457b9d", "#8338ec",
    "#f4a261", "#118ab2", "#ff006e", "#06d6a0",
]


def _load_env(name: str, default: str | None = None) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    env_file = _BACKEND / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return default


def main() -> int:
    key = _load_env("ROBOFLOW_API_KEY")
    model = _load_env("ROBOFLOW_MODEL", _DEFAULT_MODEL)
    if not key:
        print("ERROR: ROBOFLOW_API_KEY not set (in backend/.env or shell).")
        return 1
    if not _IMAGE.exists():
        print(f"ERROR: missing {_IMAGE} — save the photo there first.")
        return 1

    img = Image.open(_IMAGE).convert("RGB")
    raw = base64.standard_b64encode(_IMAGE.read_bytes()).decode()

    url = f"https://detect.roboflow.com/{model}"
    print(f"POST {url}  (image {img.size[0]}x{img.size[1]})")
    resp = httpx.post(
        url,
        params={"api_key": key, "confidence": 20, "overlap": 50},
        data=raw,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=60,
    )
    if resp.status_code != 200:
        print(f"ERROR {resp.status_code}: {resp.text[:500]}")
        return 1

    preds = resp.json().get("predictions", [])
    print(f"\n{len(preds)} detections:")
    classes: dict[str, int] = {}
    for p in preds:
        classes[p["class"]] = classes.get(p["class"], 0) + 1
    for cls, n in sorted(classes.items(), key=lambda kv: -kv[1]):
        print(f"  {n:3d}  {cls}")

    # Draw overlay: box + class + confidence. Roboflow gives center x,y + w,h.
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    except Exception:
        font = ImageFont.load_default()
    class_order = list(classes.keys())
    for p in preds:
        cx, cy, w, h = p["x"], p["y"], p["width"], p["height"]
        x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
        color = _PALETTE[class_order.index(p["class"]) % len(_PALETTE)]
        draw.rectangle([x0, y0, x1, y1], outline=color, width=4)
        draw.text((x0 + 2, max(0, y0 - 24)), f'{p["class"]} {p["confidence"]:.2f}',
                  fill=color, font=font)

    img.save(_OVERLAY)
    print(f"\nOverlay written: {_OVERLAY}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
