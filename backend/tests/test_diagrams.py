"""Tests for diagram_to_svg."""

from app.schemas.notes import Block, BlockType, Box, DiagramArrow, DiagramData, DiagramShape
from app.services.diagrams import diagram_to_svg
from app.schemas.notes import PageTheme


def _make_block() -> Block:
    return Block(
        type=BlockType.diagram,
        box=Box(x=0.05, y=0.4, w=0.9, h=0.3),
        diagram_data=DiagramData(
            shapes=[
                DiagramShape(
                    id="s1",
                    kind="box",
                    box=Box(x=0.05, y=0.1, w=0.25, h=0.4),
                    text="Start",
                    color_group=1,
                ),
                DiagramShape(
                    id="s2",
                    kind="diamond",
                    box=Box(x=0.4, y=0.1, w=0.25, h=0.4),
                    text="Check?",
                    color_group=2,
                ),
            ],
            arrows=[DiagramArrow(from_id="s1", to_id="s2", label="yes")],
        ),
    )


def test_diagram_to_svg_contains_svg_elements():
    block = _make_block()
    colors = {1: "#e63946", 2: "#2a9d8f"}
    svg = diagram_to_svg(block, colors, PageTheme.white)

    assert "<svg" in svg
    assert "<rect" in svg        # box shape
    assert "<polygon" in svg     # diamond shape
    assert "<line" in svg        # arrow
    assert "Start" in svg
    assert "Check?" in svg
    assert "yes" in svg          # arrow label
    assert svg.endswith("</svg>")


def test_diagram_to_svg_no_data_returns_placeholder():
    block = Block(type=BlockType.diagram, box=Box(x=0, y=0, w=0.5, h=0.3))
    svg = diagram_to_svg(block, {}, PageTheme.white)
    # No shapes -> a dashed placeholder box, never an empty/dropped block.
    assert "<svg" in svg
    assert "stroke-dasharray" in svg
    assert "Diagram" in svg
    assert svg.endswith("</svg>")


def test_diagram_to_svg_empty_shapes_returns_placeholder():
    from app.schemas.notes import DiagramData as _DD

    block = Block(
        type=BlockType.diagram,
        box=Box(x=0, y=0, w=0.5, h=0.3),
        diagram_data=_DD(shapes=[], arrows=[]),
    )
    svg = diagram_to_svg(block, {}, PageTheme.white)
    assert "stroke-dasharray" in svg


def test_diagram_to_svg_unknown_arrow_ids_skipped():
    block = _make_block()
    assert block.diagram_data is not None
    block.diagram_data.arrows = [DiagramArrow(from_id="s1", to_id="s99", label="")]
    svg = diagram_to_svg(block, {1: "#e63946", 2: "#2a9d8f"}, PageTheme.white)
    assert "<line" not in svg    # bad arrow silently skipped
