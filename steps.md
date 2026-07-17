# Steps — InsightPilot Build Sequence

Work through these in order. Each numbered step should be built,
verified, and committed (per dos-and-donts.md) before moving to the
next. Sub-bullets within a step are not separate commits unless a step
is large enough that you choose to break it up — see dos-and-donts.md
Section 1.

## Phase 0 — Project scaffolding
1. Initialize repo structure: `/frontend` (Next.js 14, TS, Tailwind),
   `/backend` (FastAPI), root-level `requirements.md`,
   `ui-ux-rules.md`, `dos-and-donts.md`, `steps.md`, `.gitignore`
   (must exclude `.env`, `node_modules`, `__pycache__`, `data/raw/*`).
2. Basic FastAPI app with a `/health` endpoint. Verify it runs locally
   and returns 200.
3. Basic Next.js app with an empty page that fetches `/health` from the
   backend and displays "Connected" — this proves the two talk to each
   other before anything else is built.
4. **STOP CONDITION:** ask me for the Neon Postgres connection string
   and the Gemini API key before continuing — you cannot create these.

## Phase 1 — Database + demo dataset
5. Postgres schema: a generic `datasets` table (tracks uploaded/demo
   datasets and their profiled schema as JSONB) and dynamic per-dataset
   tables created at ingestion time.
6. Data-loading script for a pre-selected free demo CSV (pick something
   genuinely interesting for a live demo — e.g. a retail sales or SaaS
   product-events dataset; suggest one to me if you're not sure, don't
   just guess silently).
7. Read-only Postgres role created and used for all query-execution
   connections (per requirements.md Section 4.4) — verify by attempting
   an INSERT with that role and confirming it's rejected.

## Phase 2 — Data ingestion + profiling
8. CSV upload endpoint: accepts a file, loads it into a new dynamic
   table, and runs the profiling logic (column types, null counts,
   min/max, distinct counts, sample rows).
9. `profile_data` tool function — callable by the agent, returns the
   stored profile for the active dataset.
10. Frontend: upload UI + demo-dataset-selector, showing the profile
    summary once loaded (this becomes the empty-state content per
    ui-ux-rules.md Section 5).

## Phase 3 — The agent core (this is the heart of the project — take
this phase slowly and verify thoroughly)
11. `generate_sql` tool — given a natural-language question + the
    dataset's profile, calls Gemini to produce a candidate SQL query.
12. `validate_sql` tool — rejects anything that isn't a single SELECT
    statement, checks referenced tables/columns exist in the profiled
    schema, injects a row-limit cap if missing. Verify with deliberate
    bad inputs (attempted DROP, attempted unknown column).
13. `execute_query` tool — runs validated SQL via the read-only role,
    returns rows + column metadata, enforces query timeout.
14. `choose_chart_type` tool — given the result set shape, picks a
    chart type + minimal config.
15. `write_insight` tool — given the question + result, produces the
    plain-English answer.
16. The orchestration loop tying 11-15 together: takes a user question,
    plans and calls tools in sequence, retries `generate_sql` up to 3x
    on execution failure, returns the final structured response
    (text + chart config + trace + optional SQL). Verify end-to-end
    with at least 5 different real questions against the demo dataset,
    including at least one that should trigger a self-correction retry.

## Phase 4 — Chat UI
17. Core chat thread UI: message list, input box, sending state.
    Follow ui-ux-rules.md Sections 1-3.
18. `ChatBubble`, `ChartCard`, `ReasoningTrace`, `ThinkingIndicator`
    components per ui-ux-rules.md Section 8.
19. Wire the live "thinking" status updates (profiling → generating
    query → running query → charting → writing insight) from backend
    to frontend as the agent works, per ui-ux-rules.md Section 4.
20. Collapsible reasoning-trace panel and "run this SQL yourself"
    expandable block per requirements.md Section 4.2.

## Phase 5 — States and polish
21. Empty state (dataset profile + example question chips), thinking
    state, self-correction reveal, error state, empty-result state —
    all per ui-ux-rules.md Section 5. Verify each by deliberately
    triggering it (ask a nonsense question, ask something with no
    matching data, etc).
22. Light/dark mode toggle, responsive/mobile layout check.
23. Full design pass against ui-ux-rules.md Section 10 — screenshot
    (if possible) and self-critique explicitly before calling this
    step done.

## Phase 6 — Deployment
24. Deploy backend to Render (free tier), frontend to Vercel (free
    tier), confirm environment variables are set (not committed) on
    both platforms.
25. **STOP CONDITION:** confirm with me that the live URL works end-to-
    end before considering the project complete — I should test it
    myself once before we call this done.

## Phase 7 — Documentation
26. Write the README: project pitch, architecture diagram (can be
    ASCII or a simple description), tech stack, setup instructions,
    demo link, and 2-3 example questions a reviewer can try.
27. Final commit + push.

---

At true completion of Phase 7, stop and summarize: what was built, what
(if anything) still needs manual action from me, and the live demo URL.
