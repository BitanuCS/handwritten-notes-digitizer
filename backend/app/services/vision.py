"""Vision service: photo -> Groq (Llama 4 Scout vision) -> structured Page."""

import base64
import json
from pathlib import Path

from groq import AsyncGroq

from app.core.config import settings
from app.schemas.notes import BlockType, DiagramData, Page
from app.utils.images import crop_normalized, prepare_image

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_notes.txt"
_DIAGRAM_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_diagram.txt"

_client: AsyncGroq | None = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client


async def extract_page(image_bytes: bytes, rotate_deg: int = 0) -> Page:
    """Run a single note photo through Groq vision into a structured Page."""
    prompt = _PROMPT_PATH.read_text()
    corrected, media_type = prepare_image(image_bytes, rotate_deg=rotate_deg)
    image_data = base64.standard_b64encode(corrected).decode()

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.groq_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_data}",
                        },
                    },
                    {"type": "text", "text": "Transcribe these handwritten notes."},
                ],
            },
        ],
    )

    data = json.loads(response.choices[0].message.content)
    page = Page(**data)
    await _fill_diagrams(page, corrected)
    return page


async def _fill_diagrams(page: Page, corrected: bytes) -> None:
    """Second pass: populate diagram_data for diagram blocks the first pass left empty.

    The combined extraction prompt reliably locates diagrams but rarely fills in
    their shapes/arrows. For each such block we crop its region from the same
    orientation-corrected image and re-prompt the model to describe only that
    diagram, which it does far more accurately on an isolated crop.
    """
    for block in page.blocks:
        if block.type != BlockType.diagram:
            continue
        if block.diagram_data is not None and block.diagram_data.shapes:
            continue
        crop = crop_normalized(corrected, block.box)
        diagram = await _extract_diagram(crop)
        if diagram is not None and diagram.shapes:
            block.diagram_data = diagram


async def _extract_diagram(crop_bytes: bytes) -> DiagramData | None:
    """Run a cropped diagram image through Groq into structured shapes + arrows.

    Returns None on any failure (bad JSON, schema mismatch, API error) so the
    caller can fall back to a placeholder rather than crash the whole convert.
    """
    prompt = _DIAGRAM_PROMPT_PATH.read_text()
    image_data = base64.standard_b64encode(crop_bytes).decode()

    client = _get_client()
    try:
        response = await client.chat.completions.create(
            model=settings.groq_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}",
                            },
                        },
                        {"type": "text", "text": "Describe this diagram as shapes and arrows."},
                    ],
                },
            ],
        )
        payload = json.loads(response.choices[0].message.content)
        return DiagramData(**payload)
    except Exception:
        return None
