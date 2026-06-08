# Handwritten Notes Digitization Tool — Project Plan

> Reference document capturing all planning decisions. We refer to this while implementing.
> Last updated: 2026-06-08

---

## Progress / Current Status

| Phase | Status |
|---|---|
| 0 — Setup | ✅ Done |
| 1 — Landing page | ✅ Done |
| 2 — Pipeline proof (photo → text) | ✅ Done |
| 3 — Positioned extraction + A4 PDF | ✅ Done |
| 4 — Colorization | ✅ Done |
| 5 — White/black toggle | ⏭️ **Next** |
| 6 — Cleanup + dates | ⬜ Pending |
| 7 — Multi-page | ⬜ Pending |
| 8 — Review/edit screen | ⚡ Core done (edit+preview+PDF+color) |
| 9 — Diagrams | ⬜ Pending |
| 10 — Polish & launch | ⬜ Pending |

**Repo:** https://github.com/BitanuCS/handwritten-notes-digitizer (pushed through Phase 4)

### What was built in the Phase 3 session (more than planned)

**Phase 3 core (as planned):**
- `layout.py` — `render_html(pages, theme)` + `_build_flow_items()`: sorts blocks by y-coordinate (reading order), computes capped relative gaps (max 3em) between blocks. Flow layout — intentionally no `position:absolute` since AI bounding boxes are too noisy for pixel placement.
- `pdf.py` — `html_to_pdf(html)` via Playwright Chromium, `wait_until="networkidle"` so KaTeX CDN loads before capture.
- `a4_white.html` / `a4_black.html` — Jinja2 templates with KaTeX CDN + auto-render, `@page { margin: 20mm 18mm }`, flow-layout blocks.
- `POST /api/pdf` — image → vision → layout → PDF bytes.

**Phase 8 core (pulled forward — edit/review screen):**
- `POST /api/render-pdf` — accepts `ConvertResponse` JSON body (no image, no vision re-run) → layout → PDF.
- `POST /api/html-to-pdf` — accepts `{"html": "..."}` (frontend's pre-rendered preview HTML) → wraps in A4 CSS → Playwright PDF. This makes PDF pixel-identical to preview.
- `layout.py` — `wrap_preview_html(inner_html, theme)`: A4 CSS wrapper for the html-to-pdf endpoint.
- **`/app/result` page** — dedicated result route; after transcription, result is saved to `sessionStorage` and the browser redirects here.
  - Left panel: full-height monospace `<textarea>` (single box for entire transcription)
  - Right panel: live KaTeX preview via `renderPreviewHtml()`, updates on every keystroke
  - Drag handle between panels: resizes both in real time, clamped 20–80%
  - "Download PDF" in top bar: captures `previewRef.current.innerHTML` → sends to `/api/html-to-pdf` → PDF = exactly what user sees in preview

_This section is updated at the end of every phase._

---

## 1. Project Overview

A web tool where users upload **one or more photos of handwritten notes**, and AI generates **clean digital notes** as a downloadable **A4 PDF**.

The goal: many handwritten notes are hard to read (bad handwriting). We keep the *exact layout* of the original page but replace the handwriting with clean, readable computer fonts — like a "digital photocopy" — and make it colorful so it's pleasant and easy to read.

---

## 2. Core Concept

The whole product is really **two steps**:

1. **Understand** — a vision-capable AI reads the photo and returns a *structured description* (what text exists, where it sits on the page, what's a diagram, what's a date, what's a page number).
2. **Render** — we take that structure and draw it onto a beautiful, colorful **A4 page**, then export it as a **PDF**.

Almost every feature below is a rule in step 1 (extraction) or step 2 (rendering).

---

## 3. Key Decision — "Digital Photocopy" Layout

This is the most important design decision and shapes the whole rendering engine.

- **Preserve each text block's original position** on the page.
- **Replace messy handwriting with a clean, readable computer font.**
- **NO restructuring** into bullets / sub-points / hierarchy. If something was a paragraph in the top-left, it stays a paragraph in the top-left — just legible.
- The vision model returns **bounding boxes** for each block; we render them as **absolutely-positioned elements on an A4 canvas**.
- **Expectation:** vision-model bounding boxes are *approximate*, not pixel-perfect. The output is a faithful *positional match* (same regions, same reading layout), not a millimeter-exact overlay. In practice this looks great.

---

## 4. Features

| # | Feature |
|---|---------|
| 1 | A beautiful **landing page** for the project. |
| 2 | **Colorful output** — each point in a different color; related points share a color. Like how humans make digital notes, so it's interesting and easy to read. |
| 3 | Everything stays at its **original position** on the page (the "photocopy" goal). |
| 4 | If a **diagram** is detected in the notes, it should also be generated in the output. |
| 5 | **Remove page numbers** and any unnecessary non-note clutter. **Keep dates** in the top-right (a date marks when the note was taken). |
| 6 | At upload, **ask the user: white page or black page** — adjust output colors accordingly. |
| 7 | Output pages are **A4**. |
| 8 | Final output is a **`.pdf` file**. |

---

## 5. Suggested Additions (accepted as roadmap)

- **Review / edit screen before export** *(highest value)* — let users fix AI misreads and tweak colors before downloading. Builds trust and output quality.
- **Math / equation support** via LaTeX (KaTeX) — study notes often have equations.
- **Confidence flagging** — highlight words the AI was unsure about so the user knows what to check.
- **Markdown / .docx export** — cheap to add once we have structured data.
- **Accounts + history** (later) — revisit past conversions.
- **Title / table-of-contents detection** for multi-page notes.

---

## 6. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Frontend | **Next.js + TypeScript + Tailwind** (+ shadcn/ui) | One ecosystem for the landing page + app UI; great for polished marketing pages. |
| Backend | **Python + FastAPI** | Handles upload, the Claude vision call, and layout/PDF rendering. |
| AI "brain" | **Groq — Llama 4 Scout vision** (free: 14,400 req/day) | Reads handwriting *and* returns structured JSON (text + boxes + color groups + diagram detection) in one call. Free tier, no billing needed. |
| PDF / A4 | **HTML + CSS (`@page A4`) rendered by Playwright** | Most reliable way to get pixel-precise A4 pages with colors, fonts, positioned blocks. |
| Equations | **KaTeX** | Renders LaTeX the AI emits. |
| Diagrams | **Crop + clean original** (early); **Mermaid.js** for flowcharts (later) | See "hard part" note below. |
| Hosting | **Vercel** (frontend/app) | Native fit for Next.js; easy phase-by-phase shipping. |
| Storage | Local temp first → **cloud (S3/R2)** later | Don't over-engineer storage early. |

### Structured JSON the vision step returns (per page)

```json
{
  "blocks": [
    { "text": "Photosynthesis occurs in...", "box": {"x":0,"y":0,"w":0,"h":0}, "colorGroup": 1, "type": "text" },
    { "text": "6CO2 + 6H2O -> ...",          "box": {"x":0,"y":0,"w":0,"h":0}, "colorGroup": 1, "type": "equation" },
    { "box": {"x":0,"y":0,"w":0,"h":0}, "type": "diagram" }
  ],
  "date": "12 March 2024",
  "pageNumberDetected": true
}
```

The backend renders these blocks as absolutely-positioned elements on an A4 canvas, in a readable font, with assigned colors → PDF.

---

## 7. The Hard Part (flagged honestly)

**Diagrams (Feature 4) are the riskiest feature.** A flowchart is easy (→ Mermaid), but an arbitrary hand-drawn sketch (a biology cell, a free-body diagram) is very hard to reproduce faithfully.

**Strategy:** early phases **detect** diagrams and **crop + clean** the original image into the output at its position. Only attempt true regeneration for recognizable types (flowcharts, graphs) later. This is pushed to a late phase so it doesn't block the rest.

---

## 8. Folder Structure (monorepo)

One repo, two apps side by side. Guiding principle: **one responsibility per file** — prompts, HTML templates, and logic each live in their own place.

```
ai-handwritten-notes/
├── frontend/                    # Next.js + TypeScript + Tailwind
│   ├── public/                  # static assets, images
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # landing page (Feature 1)
│   │   │   └── app/page.tsx      # the tool itself (upload → convert)
│   │   ├── components/
│   │   │   ├── landing/          # hero, features, footer…
│   │   │   ├── upload/           # uploader + white/black toggle (Feature 6)
│   │   │   ├── result/           # PDF preview + download
│   │   │   └── ui/               # shared primitives (shadcn/ui)
│   │   ├── lib/                  # api client, helpers
│   │   ├── hooks/
│   │   └── types/                # TS types (shared shape of a "Block", etc.)
│   ├── package.json
│   ├── tailwind.config.ts
│   └── .env.local               # frontend env (gitignored)
│
├── backend/                     # Python + FastAPI
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint
│   │   ├── core/
│   │   │   └── config.py        # settings / env loading
│   │   ├── api/routes/
│   │   │   ├── health.py
│   │   │   └── notes.py         # POST /convert endpoint
│   │   ├── schemas/            # Pydantic models (Block, Page, Request/Response)
│   │   │   └── notes.py
│   │   ├── services/           # core logic — ONE concern per file
│   │   │   ├── vision.py        # photo → Claude → structured blocks
│   │   │   ├── colorize.py      # color-grouping logic (Feature 2)
│   │   │   ├── layout.py        # blocks → A4 HTML at correct positions
│   │   │   ├── pdf.py           # HTML → PDF via Playwright (Features 7,8)
│   │   │   └── diagrams.py      # crop/clean diagrams (Feature 4)
│   │   ├── prompts/            # prompt templates kept OUT of code
│   │   │   └── extract_notes.txt
│   │   ├── templates/         # Jinja A4 HTML/CSS templates
│   │   │   ├── a4_white.html
│   │   │   └── a4_black.html
│   │   └── utils/
│   │       └── images.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env                     # API keys etc. (gitignored)
│
├── docs/                        # planning notes, architecture decisions
├── .gitignore
├── PROJECT_PLAN.md              # this file
└── README.md
```

**Why this works:**
- `services/` mirrors the pipeline exactly: `vision → colorize → layout → pdf`. Each phase touches mostly one file.
- **Prompts live in `prompts/` as text files**, not hardcoded — editing a prompt isn't a code change.
- **A4 HTML lives in `templates/`** — white and black versions (Feature 6) are just two files.
- `frontend/types/` and `backend/schemas/` define the *same* `Block` shape, so both apps speak the same language.

---

## 9. Phase Plan

| Phase | What | Features |
|---|---|---|
| **0** | **Setup** — Next.js frontend + FastAPI backend skeletons, both run locally, live URL. | — |
| **1** | **Landing page** — hero, how-it-works, example before/after, CTA. No AI yet. | 1 |
| **2** | **Pipeline proof** — upload 1 photo → Groq vision → transcribed text on screen. Image preview, 4-direction rotation, KaTeX equation rendering. Validated with real handwritten photos. | — |
| **3** | **Positioned extraction + A4 PDF** — Claude returns blocks *with bounding boxes* → render onto A4 HTML → export PDF. Black-on-white. | 3, 7, 8 |
| **4** | **Colorization** — group related blocks, assign distinct colors, render them. | 2 |
| **5** | **White/black toggle** at upload — swap A4 template color scheme. | 6 |
| **6** | **Cleanup + dates** — strip page numbers/clutter, place date top-right. | 5 |
| **7** | **Multi-page** — multiple photos → multi-page PDF. | — |
| **8** | **Review/edit screen** — fix misreads, tweak colors before download. | (added) |
| **9** | **Diagrams** — crop+clean first, Mermaid regeneration later. | 4 |
| **10** | **Polish & launch** — equations, accounts/history, extra export formats, performance, deploy. | (added) |

**Why this order:** front-loads the landing page (momentum + something to show) and the AI pipeline proof (Phase 2 — learn how well Claude reads *your* handwriting before building the rendering engine around it), and pushes the riskiest feature (diagrams) near the end.

> **Important:** Do not skip Phase 2. It tells us — in half a day, almost no code — how well Claude reads real handwriting samples. Everything else is plumbing around that core capability.

---

## 10. Git / GitHub Setup & Prerequisites

- **Monorepo**, single repo for both apps.
- Root **`.gitignore`** excludes: `node_modules/`, `.next/`, `__pycache__/`, `.venv/`, `*.env`, `.DS_Store`, build artifacts, uploaded images.

**Blockers to resolve before GitHub setup (current machine state):**
- **Node.js not on PATH** — needed for the frontend. Install: `brew install node` (or load nvm).
- **`gh` (GitHub CLI) not installed** — cleanest way to do "push every change." Install: `brew install gh` then `gh auth login`.

**Once tooling is ready:** `git init` → first commit → `gh repo create` → push. Thereafter, push on every change.

---

## 11. Open Items / Next Steps

- [ ] Confirm **Anthropic API key** is available (needed from Phase 2 on).
- [ ] Collect **2–3 sample photos** of real handwritten notes to sharpen the extraction prompt.
- [ ] Install **Node.js** and **`gh`** (see §10).
- [ ] Decide: scaffold folder structure first, or install tooling first — then begin **Phase 0**.

---

*A condensed copy of these decisions also lives in Claude's persistent memory (`project-overview.md`) so it survives across sessions. This file is the human-facing, in-repo reference.*
