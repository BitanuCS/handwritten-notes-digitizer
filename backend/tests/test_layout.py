"""Tests for layout assembly — text dedup against diagram regions."""

from app.schemas.notes import Block, BlockType, Box, Page, PageTheme
from app.services.colorize import colorize
from app.services.layout import _build_flow_items


def test_text_inside_diagram_is_suppressed():
    page = Page(blocks=[
        Block(type=BlockType.diagram, box=Box(x=0.0, y=0.3, w=1.0, h=0.5)),
        # center (0.2, 0.52) falls inside the diagram box -> already shown there.
        Block(type=BlockType.text, box=Box(x=0.1, y=0.5, w=0.2, h=0.04), text="inside"),
        # center (0.2, 0.07) above the diagram -> kept.
        Block(type=BlockType.text, box=Box(x=0.1, y=0.05, w=0.2, h=0.04), text="outside"),
    ])
    items = _build_flow_items(page, colorize(page, PageTheme.white), PageTheme.white)
    texts = [i.text for i in items if i.block_type == BlockType.text]
    assert "outside" in texts
    assert "inside" not in texts


def test_diagram_block_always_kept():
    page = Page(blocks=[
        Block(type=BlockType.diagram, box=Box(x=0.0, y=0.0, w=1.0, h=1.0)),
    ])
    items = _build_flow_items(page, colorize(page, PageTheme.white), PageTheme.white)
    assert any(i.block_type == BlockType.diagram for i in items)
