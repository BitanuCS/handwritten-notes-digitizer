# AI Handwritten Notes Digitizer

Upload photos of handwritten notes → AI generates clean, colorful digital notes as an A4 PDF.
A "digital photocopy": same layout and positions as the original, but messy handwriting is
replaced with clean, readable fonts and color-coded points.

See **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** for the full plan, decisions, and phase roadmap.

## Repository layout

```
.
├── frontend/   # Next.js + TypeScript + Tailwind (landing page + app UI)
├── backend/    # Python + FastAPI (upload, Claude vision, layout, PDF)
├── docs/       # planning notes, architecture decisions
└── PROJECT_PLAN.md
```

## Tech stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI
- **AI:** Claude vision (Anthropic API) → structured JSON
- **PDF:** HTML/CSS (A4) rendered via Playwright

## Local development

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```
Health check: http://localhost:8000/health

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:3000

## Status

Phase 0 — project setup. See PROJECT_PLAN.md §9 for the roadmap.
