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
  not `bg-gradient-*`). React 19.
- **backend/** — Python 3.11 + FastAPI. venv at `backend/.venv`.
- **AI** — Claude vision via Anthropic API → structured JSON (Block{text,box,color_group,type}).
- **PDF** — A4 HTML/CSS rendered by Playwright. KaTeX for equations. Mermaid (later) for diagrams.

## Current status
- ✅ Phase 0 (setup), ✅ Phase 1 (landing page), ✅ Phase 2 (pipeline proof). **Next: Phase 3** (positioned extraction + A4 PDF).
- Repo: https://github.com/BitanuCS/handwritten-notes-digitizer (public, branch `main`).
- Phase table is in `PROJECT_PLAN.md` → "Progress / Current Status".

## How to run
Paths contain a space — always quote them. Homebrew tools at `/opt/homebrew/bin`.
- Frontend: `cd frontend && npm run dev` → http://localhost:3000  (build: `npm run build`)
- Backend: `cd backend && ./.venv/bin/uvicorn app.main:app --reload --port 8000` → http://localhost:8000/health
- Backend tests: `cd backend && ./.venv/bin/python -m pytest`

## Environment gotchas (IMPORTANT)
- **gh CLI:** `~/.config` is owned by `root`, so gh config was relocated to `~/.gh`.
  Always `export GH_CONFIG_DIR="$HOME/.gh"` before gh/push commands (added to `~/.zshrc`,
  but a fresh non-login shell may not have it). Symptom if missing: "permission denied" on `~/.config/gh`.
- **sudo** can't be run from the `!` prompt (no TTY) — ask the user to run sudo in their own Terminal.
- **Node** only on PATH via `/opt/homebrew/bin`.

## Conventions
- One responsibility per file. Backend pipeline mirrored in `backend/app/services/`:
  vision → colorize → layout → pdf → diagrams (currently stubs raising NotImplementedError).
- Prompts live in `backend/app/prompts/` (text files, not hardcoded). A4 HTML in `backend/app/templates/`.
- Wire format is **snake_case** (Pydantic). `frontend/src/types/notes.ts` mirrors `backend/app/schemas/notes.py`.
- Box coords are normalized 0..1 relative to the page.
- Brand name "**Inkwell**" is a placeholder — single source in `frontend/src/lib/site.ts` (name, tagline, palette). User may rename.
- Before writing code that calls the Anthropic API/models, consult the `claude-api` skill (per global instructions).
- `frontend/AGENTS.md` warns Next 16 differs from training data — check `frontend/node_modules/next/dist/docs/` when unsure.

## Working agreements
- **One phase per session.** At the end of each phase: update this file + the Progress
  section in `PROJECT_PLAN.md`, then commit and push.
- Commit per phase. Push only when the user is ready (they've said push each change is fine).

## Open needs before Phase 3
- ✅ API key and photo — required for Phase 2 end-to-end test; same key powers Phase 3.
- Playwright A4 rendering (PDF output) — core of Phase 3.

## Gotcha log (append surprises here as the project grows)
- gh CLI: `~/.config` is root-owned → always `export GH_CONFIG_DIR="$HOME/.gh"`.
- Phase 2: `React.FormEvent` is deprecated in React 19 types ("doesn't actually exist"). Use `React.SyntheticEvent<HTMLFormElement>` instead.
