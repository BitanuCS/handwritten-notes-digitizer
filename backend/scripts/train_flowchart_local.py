"""Train a hand-drawn flowchart YOLO detector locally (Apple M1, CPU/MPS).

Slow but fully hands-off. Steps:
  1. Convert the cloned COCO datasets (/tmp/hdd) into a unified YOLO dataset.
  2. Train YOLOv11-nano (small imgsz/batch to fit 8 GB RAM).
  3. Copy best.pt -> backend/models/flowchart.pt.
  4. Run it on backend/sample_diagram.jpg and save an overlay PNG.

Run in the background:
    PYTHONPATH=. ./.venv/bin/python scripts/train_flowchart_local.py
"""

import glob
import json
import os
import random
import shutil
from collections import defaultdict
from pathlib import Path

random.seed(0)

_BACKEND = Path(__file__).resolve().parent.parent
SRC = Path("/tmp/hdd")
DS = Path("/tmp/yolo_ds")
RUNS = Path("/tmp/runs")
MODEL_OUT = _BACKEND / "models" / "flowchart.pt"
SAMPLE = _BACKEND / "sample_diagram.jpg"
OVERLAY = _BACKEND / "sample_detect_overlay.png"


def convert() -> str:
    """COCO -> unified YOLO dataset. Returns the data.yaml path."""
    if (DS / "data.yaml").exists():
        print("[convert] reusing existing", DS / "data.yaml")
        return str(DS / "data.yaml")

    for s in ("train", "val"):
        (DS / "images" / s).mkdir(parents=True, exist_ok=True)
        (DS / "labels" / s).mkdir(parents=True, exist_ok=True)

    valid, cat_names = [], set()
    for cf in glob.glob(str(SRC / "**" / "*.json"), recursive=True):
        try:
            d = json.load(open(cf))
        except Exception:
            continue
        if not (isinstance(d, dict) and "images" in d and "annotations" in d and "categories" in d):
            continue
        valid.append((cf, d))
        for c in d["categories"]:
            cat_names.add(c["name"])

    classes = sorted(cat_names)
    cls_idx = {n: i for i, n in enumerate(classes)}
    print("[convert] unified classes:", classes)

    disk = {}
    for p in glob.glob(str(SRC / "**" / "*"), recursive=True):
        if p.lower().endswith((".jpg", ".jpeg", ".png")):
            disk.setdefault(os.path.basename(p), p)

    def split_for(cf: str) -> str | None:
        n = os.path.basename(cf).lower()
        if "train" in n:
            return "train"
        if "test" in n or "val" in n:
            return "val"
        return None

    written = 0
    for cf, d in valid:
        id2name = {c["id"]: c["name"] for c in d["categories"]}
        by_img = defaultdict(list)
        for a in d["annotations"]:
            by_img[a["image_id"]].append(a)
        tag = Path(cf).stem
        for im in d["images"]:
            base = os.path.basename(im["file_name"])
            src = disk.get(base)
            if not src:
                continue
            W, H = im.get("width"), im.get("height")
            if not W or not H:
                continue
            # Random 90/10 split (ignore the datasets' large official test sets,
            # which would waste ~half the data on slow per-epoch validation).
            split = "val" if random.random() < 0.10 else "train"
            uniq = tag + "__" + base
            dst = DS / "images" / split / uniq
            if not dst.exists():
                shutil.copy(src, dst)
            lines = []
            for a in by_img[im["id"]]:
                name = id2name.get(a["category_id"])
                if name not in cls_idx:
                    continue
                x, y, w, h = a["bbox"]
                if w <= 0 or h <= 0:
                    continue
                cx, cy = (x + w / 2) / W, (y + h / 2) / H
                lines.append(f"{cls_idx[name]} {cx:.6f} {cy:.6f} {w / W:.6f} {h / H:.6f}")
            (DS / "labels" / split / (Path(uniq).stem + ".txt")).write_text("\n".join(lines))
            written += 1

    print("[convert] images written:", written)
    import yaml
    names = {i: nm for nm, i in cls_idx.items()}
    yaml.safe_dump(
        {"path": str(DS), "train": "images/train", "val": "images/val", "names": names},
        open(DS / "data.yaml", "w"),
    )
    return str(DS / "data.yaml")


def train(data_yaml: str) -> Path:
    import torch
    from ultralytics import YOLO

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"[train] device={device}")
    model = YOLO("yolo11n.pt")
    model.train(
        data=data_yaml, epochs=50, imgsz=640, batch=4, patience=12,
        device=device, workers=2, project=str(RUNS), name="flow", exist_ok=True,
    )
    best = RUNS / "flow" / "weights" / "best.pt"
    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(best, MODEL_OUT)
    print("[train] best weights ->", MODEL_OUT)
    return MODEL_OUT


def preview(weights: Path) -> None:
    if not SAMPLE.exists():
        print("[preview] no sample image, skipping")
        return
    from PIL import Image
    from ultralytics import YOLO

    model = YOLO(str(weights))
    r = model.predict(str(SAMPLE), conf=0.2, imgsz=1024, verbose=False)[0]
    Image.fromarray(r.plot()[:, :, ::-1]).save(OVERLAY)
    print(f"[preview] {len(r.boxes)} detections -> {OVERLAY}")
    for b in r.boxes:
        print("   ", model.names[int(b.cls)], round(float(b.conf), 2))


if __name__ == "__main__":
    data_yaml = convert()
    weights = train(data_yaml)
    preview(weights)
    print("DONE")
