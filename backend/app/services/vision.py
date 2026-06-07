"""Vision service: photo -> Gemini -> structured Page."""

import json
from pathlib import Path

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.notes import Page
from app.utils.images import detect_media_type

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_notes.txt"

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def extract_page(image_bytes: bytes) -> Page:
    """Run a single note photo through Gemini vision into a structured Page."""
    prompt = _PROMPT_PATH.read_text()
    media_type = detect_media_type(image_bytes)

    client = _get_client()
    response = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=media_type),
            "Transcribe these handwritten notes.",
        ],
        config=types.GenerateContentConfig(
            system_instruction=prompt,
            response_mime_type="application/json",
        ),
    )

    data = json.loads(response.text)
    return Page(**data)
