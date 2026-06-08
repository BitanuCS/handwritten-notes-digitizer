"""Image helpers (loading, resizing, format normalization)."""

import io

from PIL import Image, ImageOps

from app.schemas.notes import Box


def detect_media_type(data: bytes) -> str:
    """Return the API-accepted media-type string for raw image bytes."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def prepare_image(data: bytes, rotate_deg: int = 0) -> tuple[bytes, str]:
    """Correct orientation and return (processed_bytes, media_type).

    Applies EXIF transpose first, then rotates by rotate_deg degrees CCW
    (0, 90, 180, 270). User controls this from the UI when the photo is sideways.
    """
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)

    if rotate_deg:
        img = img.rotate(rotate_deg, expand=True)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue(), "image/jpeg"


def crop_normalized(data: bytes, box: Box, pad: float = 0.02) -> bytes:
    """Crop a normalized 0..1 region out of an already-corrected page image.

    Used by the two-pass diagram extractor: `data` is the orientation-corrected
    bytes the vision model already saw, so `box` (the diagram block's page box)
    maps directly to pixels. A small `pad` is added on each side so shapes near
    the edge of the AI's bounding box are not clipped. Returns JPEG bytes.
    """
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    w, h = img.size
    left = max(0.0, box.x - pad)
    top = max(0.0, box.y - pad)
    right = min(1.0, box.x + box.w + pad)
    bottom = min(1.0, box.y + box.h + pad)

    crop = img.crop(
        (int(left * w), int(top * h), int(right * w), int(bottom * h))
    )
    buf = io.BytesIO()
    crop.save(buf, format="JPEG", quality=90)
    return buf.getvalue()
