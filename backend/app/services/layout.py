"""Layout service: structured Pages -> A4 HTML (Feature 3, 7)."""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.schemas.notes import Page, PageTheme

_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=True)


def render_html(pages: list[Page], theme: PageTheme) -> str:
    """Render structured pages into a single A4 HTML document."""
    tmpl = _env.get_template(f"a4_{theme.value}.html")
    return tmpl.render(pages=pages)
