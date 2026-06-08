from app.schemas.notes import Block, BlockType, Box, Page, PageTheme
from app.services.colorize import colorize


def _block(color_group: int | None) -> Block:
    return Block(type=BlockType.text, box=Box(x=0, y=0, w=1, h=0.1), text="x", color_group=color_group)


def test_colorize_empty_page():
    page = Page(blocks=[])
    assert colorize(page, PageTheme.white) == {}


def test_colorize_no_groups():
    page = Page(blocks=[_block(None), _block(None)])
    assert colorize(page, PageTheme.white) == {}


def test_colorize_groups_are_stable():
    page = Page(blocks=[_block(2), _block(1), _block(2)])
    result = colorize(page, PageTheme.white)
    assert set(result.keys()) == {1, 2}
    # group 1 comes first (sorted), group 2 second — different colors
    assert result[1] != result[2]


def test_colorize_white_vs_black_differ():
    page = Page(blocks=[_block(1)])
    white = colorize(page, PageTheme.white)
    black = colorize(page, PageTheme.black)
    assert white[1] != black[1]


def test_colorize_palette_wraps():
    # 9 groups — group 9 should wrap back to palette[0]
    page = Page(blocks=[_block(i) for i in range(1, 10)])
    result = colorize(page, PageTheme.white)
    assert result[1] == result[9]  # 8-color palette wraps at index 8 → same as index 0
