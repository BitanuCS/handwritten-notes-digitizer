"""Tests for the YOLO->DiagramData logic (pure parts, no model needed)."""

from app.schemas.notes import Box, DiagramArrow, DiagramData, DiagramShape
from app.services.detect import (
    Detection,
    build_diagram_data,
    classify_kind,
    is_well_connected,
)


def _shape(i: int) -> DiagramShape:
    return DiagramShape(id=f"s{i}", kind="box", box=Box(x=0, y=0, w=0.1, h=0.1))


def test_is_well_connected():
    # 2 shapes + 1 arrow -> connected -> vectors.
    assert is_well_connected(DiagramData(
        shapes=[_shape(1), _shape(2)],
        arrows=[DiagramArrow(from_id="s1", to_id="s2")],
    ))
    # 4 shapes but only 1 arrow (need >=3) -> sparse -> photo embed.
    assert not is_well_connected(DiagramData(
        shapes=[_shape(i) for i in range(4)],
        arrows=[DiagramArrow(from_id="s0", to_id="s1")],
    ))
    # single shape -> not enough to be a diagram.
    assert not is_well_connected(DiagramData(shapes=[_shape(1)], arrows=[]))


def test_classify_kind_keywords():
    assert classify_kind("arrow") == "arrow"
    assert classify_kind("sequenceFlow") == "arrow"
    assert classify_kind("decision") == "diamond"
    assert classify_kind("gateway") == "diamond"
    assert classify_kind("terminator") == "rounded_box"
    assert classify_kind("process") == "box"
    assert classify_kind("task") == "box"
    assert classify_kind("event") == "circle"
    assert classify_kind("text") == "text"
    assert classify_kind("totally_unknown") is None


def test_build_diagram_data_shapes_and_arrow_direction():
    # Two boxes left/right + a horizontal arrow between them.
    dets = [
        Detection("process", "box", Box(x=0.05, y=0.4, w=0.2, h=0.2), 0.9),   # left  -> s1
        Detection("process", "box", Box(x=0.70, y=0.4, w=0.2, h=0.2), 0.9),   # right -> s2
        Detection("arrow", "arrow", Box(x=0.27, y=0.48, w=0.40, h=0.04), 0.8),
        Detection("text", "text", Box(x=0.0, y=0.0, w=0.1, h=0.05), 0.7),     # ignored
    ]
    dd = build_diagram_data(dets)
    assert [s.kind for s in dd.shapes] == ["box", "box"]          # text dropped
    assert len(dd.arrows) == 1
    # Horizontal arrow: start=left near s1, end=right near s2.
    assert dd.arrows[0].from_id == "s1"
    assert dd.arrows[0].to_id == "s2"


def test_build_diagram_data_vertical_arrow_top_to_bottom():
    dets = [
        Detection("box", "box", Box(x=0.4, y=0.05, w=0.2, h=0.15), 0.9),   # top    -> s1
        Detection("box", "box", Box(x=0.4, y=0.70, w=0.2, h=0.15), 0.9),   # bottom -> s2
        Detection("arrow", "arrow", Box(x=0.48, y=0.21, w=0.04, h=0.48), 0.8),
    ]
    dd = build_diagram_data(dets)
    assert dd.arrows[0].from_id == "s1"   # top
    assert dd.arrows[0].to_id == "s2"     # bottom


def test_build_diagram_data_no_arrow_without_two_shapes():
    dets = [
        Detection("box", "box", Box(x=0.4, y=0.4, w=0.2, h=0.2), 0.9),
        Detection("arrow", "arrow", Box(x=0.1, y=0.1, w=0.3, h=0.04), 0.8),
    ]
    dd = build_diagram_data(dets)
    assert len(dd.shapes) == 1
    assert dd.arrows == []
