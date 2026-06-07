"""Image helpers (loading, resizing, format normalization)."""

import io

from PIL import Image, ImageOps


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


def prepare_image(data: bytes) -> tuple[bytes, str]:
    """Correct orientation and return (processed_bytes, media_type).

    Two-step fix:
    1. EXIF transpose — applies the phone's embedded rotation tag (when present).
    2. Portrait → landscape rotation — handwritten notes are almost always
       written in landscape format. When a portrait photo has no EXIF rotation
       (WhatsApp strips EXIF), the text is sideways. Rotating 90° CCW makes
       text horizontal, which dramatically improves OCR accuracy.
    """
    img = Image.open(io.BytesIO(data))

    # Step 1: apply EXIF orientation tag if present
    img = ImageOps.exif_transpose(img)

    # Step 2: if still portrait after EXIF correction, rotate to landscape
    w, h = img.size
    if h > w:
        img = img.rotate(90, expand=True)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue(), "image/jpeg"
