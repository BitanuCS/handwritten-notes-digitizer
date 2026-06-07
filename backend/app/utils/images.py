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


def prepare_image(data: bytes, rotate_ccw: bool = False) -> tuple[bytes, str]:
    """Correct orientation and return (processed_bytes, media_type).

    Applies EXIF transpose (phone rotation tag) then optionally rotates 90° CCW.
    The explicit rotate is for photos taken sideways (e.g. turned notebook) where
    WhatsApp stripped the EXIF — the user controls this from the UI.
    """
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)

    if rotate_ccw:
        img = img.rotate(90, expand=True)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue(), "image/jpeg"
