"""Diagram service: render detected diagram blocks as inline SVG (Feature 4).

Shapes and arrows extracted by the AI are converted to SVG. Shape bounding boxes
are normalized 0..1 relative to the diagram block's own bounding box.
The SVG width mirrors the diagram's page-relative width so position is preserved.
"""

from app.schemas.notes import Block, PageTheme

_ARROW_COLORS = {PageTheme.white: "#888888", PageTheme.black: "#aaaaaa"}


def diagram_to_svg(block: Block, colors: dict[int, str], theme: PageTheme) -> str:
    """Convert a diagram block's shapes + arrows into an inline SVG string."""
    data = block.diagram_data
    if not data:
        return ""

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
                f'text-anchor="middle" fill="{arrow_color}">{arrow.label}</text>'
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
            parts.append(
                f'<text x="{cx:.1f}" y="{cy:.1f}" font-size="3.5" '
                f'text-anchor="middle" dominant-baseline="middle" fill="{color}">'
                f'{shape.text}</text>'
            )

    parts.append("</svg>")
    return "".join(parts)
