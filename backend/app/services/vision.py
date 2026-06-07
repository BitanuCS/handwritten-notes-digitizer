"""Vision service: photo -> Groq (Llama 4 Scout vision) -> structured Page."""

import base64
import json
from pathlib import Path

from groq import AsyncGroq

from app.core.config import settings
from app.schemas.notes import Page
from app.utils.images import detect_media_type

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_notes.txt"

_client: AsyncGroq | None = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client


async def extract_page(image_bytes: bytes) -> Page:
    """Run a single note photo through Groq vision into a structured Page."""
    prompt = _PROMPT_PATH.read_text()
    media_type = detect_media_type(image_bytes)
    image_data = base64.standard_b64encode(image_bytes).decode()

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
    return Page(**data)
