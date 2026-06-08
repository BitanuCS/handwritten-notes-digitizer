"""Tests for image helpers (crop_normalized)."""

import io

from PIL import Image

from app.schemas.notes import Box
from app.utils.images import crop_normalized


def _solid_jpeg(w: int, h: int, color=(255, 0, 0)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color).save(buf, format="JPEG")
    return buf.getvalue()


def test_crop_normalized_dimensions_match_box():
    data = _solid_jpeg(1000, 800)
    # Centre half-width, half-height region; default pad = 0.02 each side.
    box = Box(x=0.25, y=0.25, w=0.5, h=0.5)
    out = crop_normalized(data, box, pad=0.0)
    img = Image.open(io.BytesIO(out))
    assert img.size == (500, 400)


def test_crop_normalized_clamps_to_bounds():
    data = _solid_jpeg(400, 400)
    # Box at the edge: padding would push past 1.0/0.0 but must clamp.
    box = Box(x=0.9, y=0.9, w=0.2, h=0.2)
    out = crop_normalized(data, box, pad=0.05)
    img = Image.open(io.BytesIO(out))
    w, h = img.size
    assert 0 < w <= 400
    assert 0 < h <= 400
