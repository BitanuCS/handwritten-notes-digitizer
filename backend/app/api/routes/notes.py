"""Notes conversion endpoint.

Phase 2: uploaded image -> Claude vision -> structured Page (no PDF yet).
Phase 3+: add colorize -> A4 HTML -> PDF.
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.notes import ConvertResponse, Page, PageTheme
from app.services.vision import extract_page

router = APIRouter(prefix="/api", tags=["notes"])


@router.post("/convert", response_model=ConvertResponse)
async def convert(
    images: list[UploadFile] = File(...),
    theme: PageTheme = Form(PageTheme.white),
) -> ConvertResponse:
    """Convert handwritten note photos into structured digital notes.

    Phase 2: returns extracted blocks (text + bounding boxes) as JSON.
    Phase 3 will render these into a PDF.
    """
    pages: list[Page] = []
    for img in images:
        data = await img.read()
        try:
            page = await extract_page(data)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        pages.append(page)
    return ConvertResponse(pages=pages)
