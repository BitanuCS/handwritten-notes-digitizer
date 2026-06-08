"""Diagram service: render detected diagram blocks as inline SVG (Feature 4).

Shapes and arrows extracted by the AI are converted to SVG. Shape bounding boxes
are normalized 0..1 relative to the diagram block's own bounding box.
The SVG width mirrors the diagram's page-relative width so position is preserved.
"""

import textwrap
from html import escape as _esc

from app.schemas.notes import Block, PageTheme

_ARROW_COLORS = {PageTheme.white: "#888888", PageTheme.black: "#aaaaaa"}


def _fit_text(text: str, w: float, h: float) -> tuple[list[str], float]:
    """Wrap `text` to the shape box and pick a font size that fits (viewBox units)."""
    raw = " ".join(text.split())
    if not raw:
        return [], 3.5
    budget = max(5, int(w / 1.8))            # chars per line for this box width
    lines = textwrap.wrap(raw, width=budget) or [raw]
    longest = max(len(line) for line in lines)
    fs_w = (w * 1.7) / max(longest, 1)       # fit widest line
    fs_h = (h * 0.85) / (len(lines) * 1.2)   # fit all lines vertically
    return lines, max(1.3, min(3.5, fs_w, fs_h))


def _placeholder_svg(block: Block, theme: PageTheme) -> str:
    """A dashed labeled box for diagrams whose shapes could not be extracted.

    Keeps the diagram's original page position/width so the layout never loses a
    block — the reader sees a clearly marked region where a figure was drawn.
    """
    bw = block.box.w
    bh = block.box.h
    vw = 100.0
    vh = (bh / bw * 100.0) if bw > 0 else 40.0
    color = _ARROW_COLORS[theme]
    label = (block.text or "Diagram").strip() or "Diagram"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {vw:.1f} {vh:.1f}" '
        f'style="width:{bw * 100:.1f}%;height:auto;display:block;margin:0.5em 0">'
        f'<rect x="1" y="1" width="{vw - 2:.1f}" height="{vh - 2:.1f}" rx="3" '
        f'fill="none" stroke="{color}" stroke-width="0.5" stroke-dasharray="2 2"/>'
        f'<text x="{vw / 2:.1f}" y="{vh / 2:.1f}" font-size="4" '
        f'text-anchor="middle" dominant-baseline="middle" fill="{color}">'
        f'▢ {label}</text>'
        f'</svg>'
    )


def _image_svg(block: Block) -> str:
    """Embed the cropped diagram photo inside an SVG at its original page width.

    Wrapping the photo in an SVG (rather than a bare <img>) lets it flow through
    the exact same `block.svg` render path as vector diagrams — no template or
    frontend branching needed. Width mirrors the diagram's page-relative width so
    its position/scale on the A4 page matches the original.
    """
    bw = block.box.w
    bh = block.box.h
    vw = 100.0
    vh = (bh / bw * 100.0) if bw > 0 else 75.0
    href = f"data:image/jpeg;base64,{block.diagram_image}"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {vw:.1f} {vh:.1f}" '
        f'style="width:{bw * 100:.1f}%;height:auto;display:block;margin:0.5em 0">'
        f'<image href="{href}" x="0" y="0" width="{vw:.1f}" height="{vh:.1f}" '
        f'preserveAspectRatio="xMidYMid meet"/>'
        f'</svg>'
    )


def diagram_to_svg(block: Block, colors: dict[int, str], theme: PageTheme) -> str:
    """Convert a diagram block into an inline SVG string.

    Priority: embedded cropped photo (faithful position) → vector shapes/arrows →
    labeled placeholder, so a detected diagram is never silently dropped.
    """
    if block.diagram_image:
        return _image_svg(block)

    data = block.diagram_data
    if not data or not data.shapes:
        return _placeholder_svg(block, theme)

    bw = block.box.w
    bh = block.box.h
    vw = 100.0
    vh = (bh / bw * 100.0) if bw > 0 else 100.0
    arrow_color = _ARROW_COLORS[theme]

    parts: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {vw:.1f} {vh:.1f}" '
        f'style="width:{bw * 100:.1f}%;height:auto;display:block;margin:0.5em 0">',
        f'<defs><marker id="ah" markerWidth="8" markerHeight="6" '
        f'refX="8" refY="3" orient="auto">'
        f'<polygon points="0 0,8 3,0 6" fill="{arrow_color}"/></marker></defs>',
    ]

    shape_lookup = {s.id: s for s in data.shapes}

    # Arrows drawn first so they appear behind shapes.
    for arrow in data.arrows:
        fs = shape_lookup.get(arrow.from_id)
        ts = shape_lookup.get(arrow.to_id)
        if not fs or not ts:
            continue
        fx = (fs.box.x + fs.box.w / 2) * vw
        fy = (fs.box.y + fs.box.h / 2) * vh
        tx = (ts.box.x + ts.box.w / 2) * vw
        ty = (ts.box.y + ts.box.h / 2) * vh
        parts.append(
            f'<line x1="{fx:.1f}" y1="{fy:.1f}" x2="{tx:.1f}" y2="{ty:.1f}" '
            f'stroke="{arrow_color}" stroke-width="0.5" marker-end="url(#ah)"/>'
        )
        if arrow.label:
            mx = (fx + tx) / 2
            my = (fy + ty) / 2
            parts.append(
                f'<text x="{mx:.1f}" y="{my:.1f}" font-size="3" '
                f'text-anchor="middle" fill="{arrow_color}">{_esc(arrow.label)}</text>'
            )

    # Shapes.
    for shape in data.shapes:
        color = (
            colors.get(shape.color_group, arrow_color)
            if shape.color_group is not None
            else arrow_color
        )
        x = shape.box.x * vw
        y = shape.box.y * vh
        w = shape.box.w * vw
        h = shape.box.h * vh
        cx = x + w / 2
        cy = y + h / 2
        base = f'fill="{color}" fill-opacity="0.15" stroke="{color}" stroke-width="0.5"'

        if shape.kind in ("box", "rectangle"):
            parts.append(
                f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="0" {base}/>'
            )
        elif shape.kind == "rounded_box":
            parts.append(
                f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="3" {base}/>'
            )
        elif shape.kind == "diamond":
            pts = (
                f"{cx:.1f},{y:.1f} {x + w:.1f},{cy:.1f} "
                f"{cx:.1f},{y + h:.1f} {x:.1f},{cy:.1f}"
            )
            parts.append(f'<polygon points="{pts}" {base}/>')
        else:  # circle / ellipse
            parts.append(
                f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" '
                f'rx="{w / 2:.1f}" ry="{h / 2:.1f}" {base}/>'
            )

        if shape.text:
            lines, fs = _fit_text(shape.text, w, h)
            y0 = cy - (len(lines) - 1) * fs * 0.6
            tspans = "".join(
                f'<tspan x="{cx:.1f}" y="{y0 + i * fs * 1.2:.1f}">{_esc(line)}</tspan>'
                for i, line in enumerate(lines)
            )
            parts.append(
                f'<text text-anchor="middle" dominant-baseline="middle" '
                f'font-size="{fs:.2f}" fill="{color}">{tspans}</text>'
            )

    parts.append("</svg>")
    return "".join(parts)
