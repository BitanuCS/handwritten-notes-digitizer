"""Colorize service: assign readable colors to blocks by color group (Feature 2).

Related blocks (same color_group) share a color; the palette differs for
white vs black themes so all colors are readable against their background.
"""

from app.schemas.notes import Page, PageTheme

# 8 perceptually-distinct colors, tested for readability on each theme.
_WHITE_PALETTE = [
    "#2563eb",  # blue
    "#16a34a",  # green
    "#dc2626",  # red
    "#9333ea",  # purple
    "#d97706",  # amber
    "#0891b2",  # cyan
    "#db2777",  # pink
    "#65a30d",  # lime
]
_BLACK_PALETTE = [
    "#60a5fa",  # blue-400
    "#4ade80",  # green-400
    "#f87171",  # red-400
    "#c084fc",  # purple-400
    "#fbbf24",  # amber-400
    "#22d3ee",  # cyan-400
    "#f472b6",  # pink-400
    "#a3e635",  # lime-400
]


def colorize(page: Page, theme: PageTheme) -> dict[int, str]:
    """Return a mapping from color_group id → hex color for this page/theme.

    Groups are sorted by their first appearance (ascending id) so the mapping
    is stable across calls with the same page.
    """
    palette = _WHITE_PALETTE if theme == PageTheme.white else _BLACK_PALETTE
    groups = sorted({b.color_group for b in page.blocks if b.color_group is not None})
    return {g: palette[i % len(palette)] for i, g in enumerate(groups)}
