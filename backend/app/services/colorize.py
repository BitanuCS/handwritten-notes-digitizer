"""Colorize service: assign readable colors to blocks by color group (Feature 2).

Palettes are mirrored in frontend/src/app/app/result/page.tsx (COLOR_PALETTES).
Keep both in sync when changing colors.
"""

from app.schemas.notes import Page, PageTheme

# 8 distinct colors per theme. Group IDs are 1-based; cycle with (group_id - 1) % 8.
_PALETTES: dict[PageTheme, list[str]] = {
    PageTheme.white: [
        "#e63946", "#2a9d8f", "#e76f51", "#457b9d",
        "#8338ec", "#2b9348", "#f4a261", "#118ab2",
    ],
    PageTheme.black: [
        "#ff6b6b", "#4ecdc4", "#ffa552", "#74b8e8",
        "#b77bff", "#56cf72", "#ffd166", "#48cae4",
    ],
}


def colorize(page: Page, theme: PageTheme) -> dict[int, str]:
    """Map each color_group id to a hex color appropriate for the theme."""
    palette = _PALETTES[theme]
    groups: set[int] = {b.color_group for b in page.blocks if b.color_group is not None}
    for b in page.blocks:
        if b.diagram_data:
            for s in b.diagram_data.shapes:
                if s.color_group is not None:
                    groups.add(s.color_group)
    return {g: palette[(g - 1) % len(palette)] for g in groups}
