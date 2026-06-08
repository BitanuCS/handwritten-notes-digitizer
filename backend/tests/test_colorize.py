from app.schemas.notes import Block, BlockType, Box, Page, PageTheme
from app.services.colorize import _PALETTES, colorize


def _block(color_group: int | None) -> Block:
    return Block(type=BlockType.text, box=Box(x=0, y=0, w=1, h=0.1), text="x", color_group=color_group)


def test_colorize_empty_page():
    page = Page(blocks=[])
    assert colorize(page, PageTheme.white) == {}


def test_colorize_no_groups():
    page = Page(blocks=[_block(None), _block(None)])
    assert colorize(page, PageTheme.white) == {}


def test_colorize_groups_get_distinct_colors():
    page = Page(blocks=[_block(2), _block(1), _block(2)])
    result = colorize(page, PageTheme.white)
    assert set(result.keys()) == {1, 2}
    assert result[1] != result[2]


def test_colorize_white_vs_black_differ():
    page = Page(blocks=[_block(1)])
    white = colorize(page, PageTheme.white)
    black = colorize(page, PageTheme.black)
    assert white[1] != black[1]


def test_colorize_palette_wraps():
    # Group IDs are 1-based: (g-1) % 8 → group 9 wraps to same color as group 1.
    page = Page(blocks=[_block(i) for i in range(1, 10)])
    result = colorize(page, PageTheme.white)
    assert result[1] == result[9]


def test_colorize_direct_palette_mapping():
    # Group 1 → index 0, group 2 → index 1.
    page = Page(blocks=[_block(1), _block(2)])
    result = colorize(page, PageTheme.white)
    palette = _PALETTES[PageTheme.white]
    assert result[1] == palette[0]
    assert result[2] == palette[1]
