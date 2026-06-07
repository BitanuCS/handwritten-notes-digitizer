"""Vision service: photo -> Claude -> structured Page."""

import base64
import json
from pathlib import Path

import anthropic

from app.core.config import settings
from app.schemas.notes import Page
from app.utils.images import detect_media_type

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_notes.txt"

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def extract_page(image_bytes: bytes) -> Page:
    """Run a single note photo through Claude vision into a structured Page."""
    prompt = _PROMPT_PATH.read_text()
    media_type = detect_media_type(image_bytes)
    image_data = base64.standard_b64encode(image_bytes).decode()

    client = _get_client()
    async with client.messages.stream(
        model=settings.anthropic_model,
        max_tokens=8192,
        thinking={"type": "adaptive"},
        system=prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {"type": "text", "text": "Transcribe these handwritten notes."},
                ],
            }
        ],
    ) as stream:
        message = await stream.get_final_message()

    text_content = "\n".join(
        block.text
        for block in message.content
        if block.type == "text"
    )
    data = json.loads(text_content)
    return Page(**data)
