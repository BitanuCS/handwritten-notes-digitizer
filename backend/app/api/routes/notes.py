"""Notes conversion endpoint.

The core pipeline (Phase 2+): uploaded images -> Claude vision -> structured
pages -> colorize -> A4 HTML -> PDF. For now this is a stub that defines the
shape of the API; the services it will call live in app/services/.
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.notes import PageTheme

router = APIRouter(prefix="/api", tags=["notes"])


@router.post("/convert")
async def convert(
    images: list[UploadFile] = File(...),
    theme: PageTheme = Form(PageTheme.white),
):
    """Convert handwritten note photos into a digital A4 PDF.

    Not implemented yet — wired up in Phase 2 (vision) and Phase 3 (PDF).
    """
    raise HTTPException(status_code=501, detail="Not implemented yet (Phase 2+).")
