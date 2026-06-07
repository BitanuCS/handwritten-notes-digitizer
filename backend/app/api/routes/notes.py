"""Notes conversion endpoints.

Phase 2: /api/convert     — image -> Groq vision -> structured JSON.
Phase 3: /api/pdf         — image -> vision -> A4 HTML -> PDF bytes.
         /api/render-pdf  — ConvertResponse JSON -> A4 HTML -> PDF bytes (no vision re-run).
"""

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.schemas.notes import ConvertResponse, Page, PageTheme
from app.services.layout import render_html
from app.services.pdf import html_to_pdf
from app.services.vision import extract_page

router = APIRouter(prefix="/api", tags=["notes"])

_PDF_HEADERS = {"Content-Disposition": 'attachment; filename="notes.pdf"'}


@router.post("/convert", response_model=ConvertResponse)
async def convert(
    images: list[UploadFile] = File(...),
    theme: PageTheme = Form(PageTheme.white),
    rotate: int = Form(0),
) -> ConvertResponse:
    """Convert handwritten note photos into structured digital notes.

    rotate: degrees CCW to rotate before OCR (0, 90, 180, 270).
    """
    pages: list[Page] = []
    for img in images:
        data = await img.read()
        try:
            page = await extract_page(data, rotate_deg=rotate)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        pages.append(page)
    return ConvertResponse(pages=pages)


@router.post("/pdf")
async def convert_to_pdf(
    images: list[UploadFile] = File(...),
    theme: PageTheme = Form(PageTheme.white),
    rotate: int = Form(0),
) -> Response:
    """Convert handwritten note photos to a downloadable A4 PDF."""
    pages: list[Page] = []
    for img in images:
        data = await img.read()
        try:
            page = await extract_page(data, rotate_deg=rotate)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        pages.append(page)

    html = render_html(pages, theme)
    try:
        pdf_bytes = await html_to_pdf(html)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF render failed: {exc}") from exc

    return Response(content=pdf_bytes, media_type="application/pdf", headers=_PDF_HEADERS)


@router.post("/render-pdf")
async def render_pdf(
    body: ConvertResponse,
    theme: PageTheme = Query(PageTheme.white),
) -> Response:
    """Render an already-extracted (possibly user-edited) ConvertResponse to PDF.

    Skips vision extraction entirely — use after /api/convert when the user
    has reviewed or corrected the transcription in the UI.
    """
    html = render_html(body.pages, theme)
    try:
        pdf_bytes = await html_to_pdf(html)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF render failed: {exc}") from exc

    return Response(content=pdf_bytes, media_type="application/pdf", headers=_PDF_HEADERS)
