"""Vision service: photo -> Groq (Llama 4 Scout vision) -> structured Page."""

import base64
import json
from pathlib import Path

from groq import AsyncGroq

from app.core.config import settings
from app.schemas.notes import BlockType, DiagramData, Page
from app.services.detect import (
    build_diagram_data,
    detect,
    detect_available,
    is_well_connected,
)
from app.utils.images import crop_normalized, prepare_image

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_notes.txt"
_DIAGRAM_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_diagram.txt"
_SHAPE_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "transcribe_shape.txt"

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
    """Embed a cropped photo of each diagram region (a faithful 'photocopy').

    LLM vector reconstruction placed shapes/arrows inaccurately, so instead we
    crop the diagram straight out of the orientation-corrected page and embed it
    at its original position. This guarantees the diagram's layout matches the
    original exactly — the project's core 'digital photocopy' requirement.

    (When a trained YOLO detector is wired in, swap this to populate
    `diagram_data` with accurately-localized shapes + arrows instead.)
    """
    for block in page.blocks:
        if block.type != BlockType.diagram:
            continue
        crop = crop_normalized(corrected, block.box, pad=0.01, max_dim=1600)

        # Hybrid routing. YOLO vectors give clean, correctly-positioned shapes,
        # but only faithfully represent a figure when the detected arrows actually
        # connect the shapes. A connected diagram of n shapes needs ~n-1 arrows;
        # far fewer means we're missing the structure (dense flowchart, weak arrow
        # recall) and the cropped photo preserves it better. So:
        #   well-connected vectors  -> redraw clean shapes + arrows
        #   sparse / few arrows     -> embed the cropped photo (faithful photocopy)
        if detect_available():
            dd = build_diagram_data(detect(crop))
            if is_well_connected(dd):
                await _fill_shape_texts(crop, dd)
                block.diagram_data = dd
                block.diagram_image = None
                continue

        # Fallback: embed the cropped photo at its original position. Clear any
        # stale first-pass diagram_data so the photo is the single source.
        block.diagram_data = None
        block.diagram_image = base64.standard_b64encode(crop).decode()


async def _fill_shape_texts(crop: bytes, data: DiagramData) -> None:
    """Transcribe the handwritten label inside each detected shape via Groq.

    Each shape box is normalized to the diagram crop, so we crop the shape region
    out of the same bytes and read just that label — what the model is good at.
    """
    for shape in data.shapes:
        small = crop_normalized(crop, shape.box, pad=0.005, max_dim=400)
        shape.text = await _transcribe_crop(small)


async def _transcribe_crop(crop_bytes: bytes) -> str:
    """Read the short handwritten text inside one shape crop. '' on any failure."""
    prompt = _SHAPE_PROMPT_PATH.read_text()
    image_data = base64.standard_b64encode(crop_bytes).decode()
    client = _get_client()
    try:
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                        },
                        {"type": "text", "text": "Transcribe the text inside this shape."},
                    ],
                },
            ],
        )
        return (response.choices[0].message.content or "").strip().strip('"')
    except Exception:
        return ""


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
