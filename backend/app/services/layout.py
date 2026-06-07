"""Layout service: structured Pages -> A4 HTML (Feature 3, 7).

Phase 3 implements this. Renders each block as an absolutely-positioned element
on an A4 canvas at its normalized box coordinates, using a readable font and the
theme template (app/templates/a4_white.html / a4_black.html).
"""

from app.schemas.notes import Page, PageTheme


def render_html(pages: list[Page], theme: PageTheme) -> str:
    """Render structured pages into a single A4 HTML document."""
    raise NotImplementedError("Implemented in Phase 3.")
