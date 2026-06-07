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
