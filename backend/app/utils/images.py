"""Image helpers (loading, resizing, format normalization)."""


def detect_media_type(data: bytes) -> str:
    """Return the Anthropic-accepted media-type string for raw image bytes.

    Checks magic bytes only — no file-extension heuristics.
    Falls back to image/jpeg (API will reject if actually wrong).
    """
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"
