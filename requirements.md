# InsightPilot — Requirements

## 1. What This Project Is

InsightPilot is an autonomous AI business analyst. A user uploads a
dataset (CSV) or connects it to a pre-loaded demo database, then asks
questions in plain English — "why did revenue dip in March," "which
segment churns the most," "show me the trend for signups" — and an AI
agent plans a multi-step analysis, writes and runs SQL, decides the
right chart, and returns a plain-English answer with the visualization
attached.

This is NOT a chatbot bolted onto a static dashboard. The agent decides
its own steps. That distinction is the entire point of the project —
protect it at every stage of the build.

## 2. Business Framing (for the eventual portfolio write-up)

**Problem:** Business teams have data but rely on analysts to translate
every question into SQL and a chart. That's slow and doesn't scale.

**What InsightPilot proves:** a non-technical user can get a trustworthy,
correctly-caveated answer to an open-ended business question in seconds,
without writing SQL, and can see exactly how the agent got there (this
transparency is a requirement, not a nice-to-have — see Section 6).

## 3. Tech Stack (100% free tier — do not introduce any paid service
without explicitly asking me first)

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS,
  Framer Motion — hosted on Vercel (free tier)
- **Backend:** FastAPI (Python) — hosted on Render (free tier)
- **Database:** Neon Postgres (free tier)
- **AI / LLM:** Google Gemini API (free tier) — used for both the
  agent's reasoning/tool-calling loop and final insight-writing
- **Version control:** GitHub — repo at
  git@github.com:vedjr02/InsightPilot.git

## 4. Core Functional Requirements

### 4.1 Data ingestion
- User can upload a CSV (max size appropriate for free-tier limits,
  e.g. 10MB) OR select a pre-loaded demo dataset.
- On upload, the system profiles the data automatically: column names,
  types, null counts, min/max/distinct-count per column, sample rows.
  This profile is stored and shown to the user before they ask anything
  — so they know what the agent actually has access to.
- Uploaded data is loaded into a Postgres table scoped to that session/
  upload (don't mix multiple users' uploads into one table).

### 4.2 The agent loop (the core of the product)
The agent must work as a **tool-calling loop**, not a single prompt-in/
answer-out call. Required tools, each a discrete function the agent can
invoke:

1. `profile_data` — returns schema + summary stats for the active dataset
2. `generate_sql` — given a natural-language sub-question, generates a
   SQL query against the known schema
3. `validate_sql` — checks the generated SQL is read-only (SELECT only,
   no DDL/DML), enforces a row-limit cap, rejects anything touching
   tables outside the current dataset scope
4. `execute_query` — runs the validated SQL against Postgres, returns
   results
5. `choose_chart_type` — given the shape of the result set (time series,
   categorical breakdown, single number, distribution), decides bar vs.
   line vs. pie vs. single-stat vs. table
6. `write_insight` — given the query result, writes a plain-English
   explanation: what the data shows, and (only when genuinely
   supportable) what it might suggest doing next

The agent must be able to:
- Chain multiple tool calls for a single question (e.g. profile first,
  then generate + validate + execute, then chart, then insight)
- Self-correct: if `execute_query` errors (bad column name, syntax
  error), the agent must retry by regenerating the SQL — up to 3
  attempts — before telling the user it couldn't answer, rather than
  surfacing a raw database error.
- Show its work: the UI must display the reasoning trace (which tools
  were called, in what order, and why) in a collapsible panel — this
  is a requirement, not optional, because "the agent's transparency"
  is a core part of what this project demonstrates.

### 4.3 Chat interface
- Conversation-style UI, not a dashboard grid.
- Each agent response can include: text explanation, an inline
  generated chart, a collapsible "how I got this answer" trace, and
  (if relevant) a "run this SQL yourself" expandable code block.
- Conversation history persists within a session (does not need to
  persist across browser sessions/logins — no auth required, see
  Out of Scope).
- Suggested starter questions shown on first load (e.g. "What are the
  top 5 categories by volume?") so the empty state isn't a blank box.

### 4.4 Guardrails (non-negotiable — these protect both the demo and
the DB, and they are also a talking point for interviews)
- The Postgres role the app connects with must be READ-ONLY at the
  database-permission level, not just "the AI was told to only SELECT."
  Permissions enforced at the DB layer, not just prompt-layer trust.
- Row limit cap (e.g. 1,000 rows) enforced server-side on every query,
  regardless of what the AI generates.
- Query timeout (e.g. 5 seconds) to prevent runaway queries.
- No raw user input is ever interpolated directly into SQL strings —
  parameterize everything possible; for AI-generated SQL, validate
  against an allowlist of table/column names known from the profiled
  schema before execution.

## 5. Non-Functional Requirements
- Must run entirely on free tiers (Vercel, Render, Neon, Gemini free
  quota) — flag clearly if any step risks exceeding a free-tier limit.
- UI must follow ui-ux-rules.md strictly — no default AI-generated look.
- Agent reasoning trace must be understandable to a non-technical
  reviewer (interviewer), not just a raw JSON tool-call dump.
- Backend response for a typical question: under ~8-10 seconds
  end-to-end (multiple LLM calls + DB round trip is expected to be
  slower than a static dashboard — this is fine and expected).

## 6. Out of Scope (do not build these — flag if asked to)
- User authentication / multi-user accounts
- Real-time streaming data / live data connections
- Editing or writing back to the database (strictly read-only, always)
- Support for file types other than CSV
- Payment/billing of any kind

## 7. Success Criteria (how we'll know it's done)
- A user can upload a CSV, ask 3-5 different natural-language questions
  in a row, and get correct, chart-backed, plain-English answers with
  a visible reasoning trace for each.
- At least one deliberately "hard" question (e.g. one requiring a
  multi-step query, or one the agent initially gets wrong and
  self-corrects) is demoable live — this becomes the portfolio
  highlight moment.
- The whole thing is deployed and live at a public Vercel URL, with a
  working demo dataset pre-loaded so it doesn't require the visitor to
  bring their own CSV to try it.
