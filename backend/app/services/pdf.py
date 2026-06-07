"""PDF service: A4 HTML -> PDF via Playwright (Feature 7, 8)."""

from playwright.async_api import async_playwright


async def html_to_pdf(html: str) -> bytes:
    """Render A4 HTML to PDF bytes using a headless Chromium browser."""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content(html, wait_until="networkidle")
        pdf_bytes = await page.pdf(format="A4", print_background=True)
        await browser.close()
        return pdf_bytes
