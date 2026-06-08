"""Shared data shapes for a digitized note.

The vision service returns `Page` objects; the layout/PDF services consume them.
The frontend mirrors these in frontend/src/types/ so both sides agree on a Block.
Coordinates are normalized to 0..1 relative to the page (top-left origin), so they
are resolution-independent when mapped onto an A4 canvas.
"""

from enum import Enum

from pydantic import BaseModel


class BlockType(str, Enum):
    text = "text"
    equation = "equation"
    diagram = "diagram"


class PageTheme(str, Enum):
    white = "white"
    black = "black"


class Box(BaseModel):
    """Normalized bounding box, each value in 0..1 relative to the page."""

    x: float
    y: float
    w: float
    h: float


class DiagramShape(BaseModel):
    id: str
    kind: str                        # "box", "rounded_box", "diamond", "circle", "ellipse"
    box: Box                         # 0..1 relative to the diagram block's own bounding box
    text: str = ""
    color_group: int | None = None


class DiagramArrow(BaseModel):
    from_id: str | None = None   # tolerant: the LLM first pass sometimes emits null
    to_id: str | None = None
    label: str = ""


class DiagramData(BaseModel):
    shapes: list[DiagramShape] = []
    arrows: list[DiagramArrow] = []


class Block(BaseModel):
    type: BlockType
    box: Box
    text: str | None = None          # for text / equation blocks
    color_group: int | None = None   # related blocks share a color group
    diagram_data: DiagramData | None = None   # for diagram blocks (from AI)
    diagram_image: str | None = None          # base64 JPEG crop of the diagram region (photocopy)
    svg: str | None = None                    # computed by backend, not from AI


class Page(BaseModel):
    blocks: list[Block] = []
    date: str | None = None          # placed top-right in output (Feature 5)
    page_number_detected: bool = False  # detected then removed (Feature 5)


class ConvertResponse(BaseModel):
    pages: list[Page]
