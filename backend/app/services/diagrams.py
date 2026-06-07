"""Diagram service: handle detected diagrams (Feature 4).

Phase 9 implements this. Early strategy: crop the diagram region from the original
image and clean it, then place it at its box in the output. Later: regenerate
flowchart-type diagrams as vector (Mermaid).
"""

from app.schemas.notes import Block


def crop_diagram(image_bytes: bytes, block: Block) -> bytes:
    """Crop and clean a diagram region from the source image."""
    raise NotImplementedError("Implemented in Phase 9.")
