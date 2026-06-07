"""Colorize service: assign readable colors to blocks by color group (Feature 2).

Phase 4 implements this. Related blocks (same color_group) get the same color;
the palette differs for white vs black themes for contrast/readability.
"""

from app.schemas.notes import Page, PageTheme


def colorize(page: Page, theme: PageTheme) -> dict[int, str]:
    """Map each color_group id to a hex color appropriate for the theme."""
    raise NotImplementedError("Implemented in Phase 4.")
