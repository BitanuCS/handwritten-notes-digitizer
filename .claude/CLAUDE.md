# CLAUDE.md — working notes for this project

> My own cross-session reference. Auto-loads each session. I keep it current at the
> end of every phase. Full plan lives in `PROJECT_PLAN.md` (root). Decisions also in
> Claude memory (`MEMORY.md`).

## What this project is
Handwritten-notes digitizer: user uploads photos of handwritten notes → AI returns a
clean, colorful **A4 PDF**. Layout philosophy = **"digital photocopy"**: keep each
block's original position, replace messy handwriting with a clean readable font,
color-code related points. NO restructuring into bullets/hierarchy.

## Stack
- **frontend/** — Next.js 16 (App Router) + TypeScript + Tailwind **v4** (`bg-linear-*`,
  not `bg-gradient-*`). React 19. KaTeX for equation rendering (`katex` npm package).
- **backend/** — Python 3.11 + FastAPI. venv at `backend/.venv`.
- **AI** — Groq (Llama 4 Scout vision, free tier: 14,400 req/day) via `groq` SDK →
  structured JSON (Block{text,box,color_group,type}). Key in `backend/.env` as `GROQ_API_KEY`.
  Free key at https://console.groq.com.
- **PDF** — A4 HTML/CSS rendered by Playwright. KaTeX for equations. Mermaid (later).

## Current status
- ✅ Phase 0–4 done. ⚡ Phase 8 core done (edit+preview UI). **Next: Phase 5** (white/black toggle).
- Repo: https://github.com/BitanuCS/handwritten-notes-digitizer (public, branch `main`).
- Phase table is in `PROJECT_PLAN.md` → "Progress / Current Status".

## How to run
Paths contain a space — always quote them. Homebrew tools at `/opt/homebrew/bin`.
- Frontend: `cd frontend && npm run dev` → http://localhost:3000
- Backend: `cd backend && ./.venv/bin/uvicorn app.main:app --reload --port 8000` → http://localhost:8000/health
- Backend tests: `cd backend && ./.venv/bin/python -m pytest`

## Environment gotchas (IMPORTANT)
- **gh CLI:** `~/.config` is owned by `root`, so gh config was relocated to `~/.gh`.
  Always `export GH_CONFIG_DIR="$HOME/.gh"` before gh/push commands.
  Symptom if missing: "permission denied" on `~/.config/gh`.
- **sudo** can't be run from the `!` prompt (no TTY) — ask the user to run sudo in their own Terminal.
- **Node** only on PATH via `/opt/homebrew/bin`.
- **Groq API key** format starts with `gsk_...`. Key is in `backend/.env` (gitignored).
- **Google Gemini** was tried and rejected — free-tier quota was `limit: 0` due to the
  API not being enabled on the GCP project. Groq is the replacement.

## Conventions
- One responsibility per file. Backend pipeline mirrored in `backend/app/services/`:
  vision → colorize → layout → pdf → diagrams (colorize/layout/pdf/diagrams are stubs).
- Prompts live in `backend/app/prompts/` (text files, not hardcoded). A4 HTML in `backend/app/templates/`.
- Wire format is **snake_case** (Pydantic). `frontend/src/types/notes.ts` mirrors `backend/app/schemas/notes.py`.
- Box coords are normalized 0..1 relative to the page.
- Brand name "**Inkwell**" is a placeholder — single source in `frontend/src/lib/site.ts`.
- `frontend/AGENTS.md` warns Next 16 differs from training data — check `frontend/node_modules/next/dist/docs/` when unsure.

## Phase 2 — what was built (for Phase 3 context)
- **`backend/app/services/vision.py`** — calls Groq `meta-llama/llama-4-scout-17b-16e-instruct`
  with base64 image; `response_format={"type":"json_object"}` for structured JSON output.
- **`backend/app/utils/images.py`** — `prepare_image(data, rotate_deg=0)`: EXIF transpose +
  optional CCW rotation (0/90/180/270°). WhatsApp strips EXIF so rotation is user-controlled.
- **`backend/app/api/routes/notes.py`** — `POST /api/convert` accepts `images`, `theme`, `rotate` (int).
- **`frontend/src/app/app/page.tsx`** — image preview, 4-direction ↻ Rotate button, KaTeX rendering.
- **`frontend/src/lib/api.ts`** — `convertNotes(images, theme, rotate)` returns `ConvertResponse`.
- **`frontend/src/app/globals.css`** — KaTeX CSS imported globally here (not component-level).
- **Prompt** (`backend/app/prompts/extract_notes.txt`) — "ONE BLOCK = ONE VISUAL ROW" rule;
  orientation hint for sideways photos; no restructuring.

## KaTeX rendering (Phase 2 lessons)
- Model outputs `$...$` or `$$...$$` delimiters around math — strip before passing to KaTeX.
- `renderWithLatex()`: splits on `$...$`; renders math parts via KaTeX, escapes prose as HTML.
  Do NOT pass whole mixed string to KaTeX (causes math-mode italics on prose + double render).
- `renderEquationBlock()`: displayMode=true, strips `$`/`$$` delimiters first.
- KaTeX CSS **must** be imported globally (`globals.css`) — component-level import doesn't
  reliably hide `.katex-mathml`, causing the content to appear twice.

## Working agreements
- **One phase per session.** At the end of each phase: update this file + the Progress
  section in `PROJECT_PLAN.md`, then commit and push.
- Push on every session end (user confirmed this is fine).

## Phase 3 + Phase 8 core — what was built (for Phase 4 context)

### PDF pipeline (Phase 3)
- **`backend/app/services/layout.py`** — `render_html(pages, theme)` + `_build_flow_items()`:
  sorts blocks by `box.y` (reading order), computes capped relative gaps (max `_MAX_GAP_EM=3.0`
  em) between adjacent blocks. **No `position:absolute`** — AI boxes are too noisy for pixel
  placement; flow layout gives clean, readable documents.
  Also: `wrap_preview_html(inner_html, theme)` — wraps frontend-rendered HTML in A4 CSS for
  the html-to-pdf endpoint (KaTeX already rendered as spans, only CSS needed).
- **`backend/app/services/pdf.py`** — `html_to_pdf(html)`: Playwright Chromium,
  `wait_until="networkidle"` (needed for KaTeX CDN to load and render).
- **`backend/app/templates/a4_white.html`** / **`a4_black.html`** — Jinja2 with KaTeX CDN
  (CSS + JS + auto-render), `@page { margin: 20mm 18mm }`, flow-layout block loop with
  `margin-top` per block computed from `gap_em`.
- **`backend/app/api/routes/notes.py`** — three PDF endpoints:
  - `POST /api/pdf` — image → vision → layout → PDF (original pipeline)
  - `POST /api/render-pdf` — `ConvertResponse` JSON body → layout → PDF (no vision re-run)
  - `POST /api/html-to-pdf` — `{"html": "..."}` body → `wrap_preview_html` → Playwright PDF

### Result page + edit UI (Phase 8 core, pulled forward)
- **`frontend/src/app/app/page.tsx`** — upload-only; after transcription saves `ConvertResponse`
  to `sessionStorage` and `router.push("/app/result")`.
- **`frontend/src/app/app/result/page.tsx`** — dedicated result page:
  - Reads `ConvertResponse` from `sessionStorage` on mount; redirects to `/app` if missing.
  - **Left panel (Edit)**: single full-height monospace `<textarea>` with all block texts joined
    by `\n\n`. User edits freely.
  - **Drag handle**: 5px bar with grip dots; global `mousemove`/`mouseup` listeners resize both
    panels in real time; `splitPct` clamped 20–80%; sets `body.userSelect` during drag.
  - **Right panel (Preview)**: `renderPreviewHtml(editedText)` — splits on `\n`, runs
    `renderWithLatex()` per line, joins with `<br>`. Updates live on every keystroke.
  - **Download PDF** (top bar): reads `previewRef.current.innerHTML` → `htmlToPdf()` →
    `/api/html-to-pdf`. PDF is a literal snapshot of the preview panel — pixel-identical.
- **`frontend/src/lib/api.ts`** — `htmlToPdf(innerHtml, theme)` → blob URL.

### Key architecture decisions (important for Phase 5+)
- `FlowItem` in `layout.py` now carries `color_hex: str | None` — set by `colorize()`.
- `colorize(page, theme)` in `colorize.py` returns `dict[int, str]` mapping color_group → hex.
  8-color palettes: `_WHITE_PALETTE` / `_BLACK_PALETTE`. Groups sorted by id for stability.
- Templates (`a4_white.html`, `a4_black.html`) inject `color: {{ item.color_hex }};` inline
  when present; falls back to the body default color otherwise.
- Frontend preview: `buildBlockColors(result, theme)` computes a `string[]` (one color per
  text block). `renderPreviewHtml(text, blockColors)` wraps each paragraph (split on `\n\n`)
  in `<span style="color:…">` when a color is assigned. `blockColors` is a `useMemo` on `result`.
- PDF export captures `previewRef.current.innerHTML` — inline color styles come through
  automatically; no changes needed to the html-to-pdf pipeline.

## Gotcha log
- gh CLI: `~/.config` is root-owned → always `export GH_CONFIG_DIR="$HOME/.gh"`.
- Phase 2: `React.FormEvent` is deprecated in React 19. Use `React.SyntheticEvent<HTMLFormElement>`.
- Phase 2: WhatsApp strips EXIF — auto-rotation heuristic (portrait→landscape) broke correctly-oriented photos. Solution: user-controlled rotate param.
- Phase 2: Groq model outputs `$...$` around math. Passing these to KaTeX causes "Can't use '$' in math mode" error. Always strip delimiters first.
- Phase 2: KaTeX CSS in component-level import doesn't suppress `.katex-mathml` in Next.js — import in `globals.css` instead.
