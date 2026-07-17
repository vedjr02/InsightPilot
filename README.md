# InsightPilot

Autonomous AI business analyst. Upload a CSV (or use the bundled retail
sales demo), ask questions in plain English, and get chart-backed answers
with a visible reasoning trace — the agent plans its own SQL, validates
it, runs it read-only, and explains what it found.

**Live demo:** [https://insightpilot-orpin.vercel.app](https://insightpilot-orpin.vercel.app)

**API:** [https://insightpilot-9fsw.onrender.com](https://insightpilot-9fsw.onrender.com)

> Render’s free tier sleeps after idle time — the first request after a
> nap can take 30–60 seconds.

## Architecture

```
Browser (Next.js / Vercel)
    │  REST + SSE
    ▼
FastAPI agent loop (Render)
    ├── profile_data
    ├── generate_sql  ──► Gemini (flash-lite)
    ├── validate_sql
    ├── execute_query ──► Neon Postgres (read-only role)
    ├── choose_chart_type
    └── write_insight ──► Gemini
```

## Tech stack

- **Frontend:** Next.js 14, TypeScript, Tailwind, Framer Motion, Recharts
- **Backend:** FastAPI, psycopg, Google Gemini
- **Database:** Neon Postgres (owner + read-only role)
- **Hosting:** Vercel (frontend) + Render (API)

## Local setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill DATABASE_URL, DATABASE_READONLY_URL, GEMINI_API_KEY
python -m app.migrate
python -m app.setup_readonly   # creates read-only role, writes DATABASE_READONLY_URL
python -m app.load_demo
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000

## Demo questions to try

1. What are the top 5 categories by revenue?
2. Why did Electronics revenue dip in March?
3. Which segment has the highest return rate?

## Guardrails

- Agent SQL is validated (SELECT-only, schema allowlist, row cap) before run
- Queries execute as a Postgres **read-only** role
- Statement timeout 5s; row cap 1000
