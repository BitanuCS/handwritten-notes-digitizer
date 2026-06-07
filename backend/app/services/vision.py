"""Vision service: photo -> Claude -> structured Page.

Phase 2 implements this. It loads the prompt from app/prompts/extract_notes.txt,
sends the image to the Claude vision API, and parses the JSON response into a
`Page` (see app/schemas/notes.py).
"""

from app.schemas.notes import Page


async def extract_page(image_bytes: bytes) -> Page:
    """Run a single note photo through Claude vision into a structured Page."""
    raise NotImplementedError("Implemented in Phase 2.")
