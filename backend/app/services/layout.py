"""Layout service: structured Pages -> A4 HTML (Feature 3, 7).

Converts AI-extracted blocks into a sorted reading-order flow layout.
Absolute positioning is intentionally avoided — AI bounding boxes are
approximate and produce ragged edges when used for pixel placement.
"""

from dataclasses import dataclass
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.schemas.notes import BlockType, Page, PageTheme
from app.services.colorize import colorize

_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=True)

# A4 at 11pt/1.5 line-height is ~85 em tall inside 20mm margins.
# Multiply normalized y-delta by this to get an em gap.
_PAGE_HEIGHT_EM = 85.0
# Cap the blank space between any two blocks so the AI's habit of
# spreading blocks across the full page doesn't create huge whitespace.
_MAX_GAP_EM = 3.0


@dataclass
class FlowItem:
    block_type: BlockType
    text: str
    gap_em: float       # margin-top before this item
    color_group: int | None
    color_hex: str | None   # resolved hex color, or None for default theme color


def _build_flow_items(page: Page, color_map: dict[int, str]) -> list[FlowItem]:
    """Convert one page's blocks into a sorted, gap-annotated list."""
    eligible = [b for b in page.blocks if b.type != BlockType.diagram and b.text]
    eligible.sort(key=lambda b: (b.box.y, b.box.x))

    items: list[FlowItem] = []
    for i, block in enumerate(eligible):
        if i == 0:
            gap_em = 0.0
        else:
            prev = eligible[i - 1]
            raw = (block.box.y - prev.box.y) * _PAGE_HEIGHT_EM
            gap_em = min(max(raw, 0.0), _MAX_GAP_EM)
        items.append(FlowItem(
            block_type=block.type,
            text=block.text,  # type: ignore[arg-type]
            gap_em=gap_em,
            color_group=block.color_group,
            color_hex=color_map.get(block.color_group) if block.color_group is not None else None,
        ))
    return items


def render_html(pages: list[Page], theme: PageTheme) -> str:
    """Render structured pages into a single A4 HTML document."""
    tmpl = _env.get_template(f"a4_{theme.value}.html")
    color_maps = [colorize(p, theme) for p in pages]
    flow_pages = [_build_flow_items(p, color_maps[i]) for i, p in enumerate(pages)]
    return tmpl.render(pages=pages, flow_pages=flow_pages)


def wrap_preview_html(inner_html: str, theme: PageTheme) -> str:
    """Wrap frontend-rendered preview HTML in a minimal A4 document for PDF export.

    The inner_html is already KaTeX-rendered by the browser, so no JS needed —
    only the KaTeX CSS for styling the pre-rendered spans.
    """
    bg = "#141414" if theme == PageTheme.black else "#ffffff"
    fg = "#e8e8e8" if theme == PageTheme.black else "#1a1a1a"
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    @page {{ size: A4; margin: 20mm 18mm; }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: {fg};
      background: {bg};
    }}
  </style>
</head>
<body>
  {inner_html}
</body>
</html>"""
