"""PDF service: A4 HTML -> PDF via Playwright (Feature 7, 8).

Phase 3 implements this. Uses a headless browser to print the layout HTML to an
A4 PDF, preserving exact positions, fonts, and colors.
"""


async def html_to_pdf(html: str) -> bytes:
    """Render A4 HTML to PDF bytes."""
    raise NotImplementedError("Implemented in Phase 3.")
