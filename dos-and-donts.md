# Do's and Don'ts — InsightPilot

This file governs HOW you (Cursor) work on this project, separate from
requirements.md (WHAT to build) and ui-ux-rules.md (what it should look
like). Read this in full before starting any work session.

## The core workflow: build → verify → fix → commit → next

For every step in steps.md, you must follow this loop without stopping
in between, unless a stop condition (Section 4) is hit:

1. **Build** the step — write the code for that step only, not ahead of it.
2. **Verify it yourself:**
   - Run the backend and check it starts without errors.
   - Run the frontend and check it builds/renders without errors.
   - If the step added an API endpoint, actually call it (curl or a
     quick script) and check the response looks correct.
   - If the step added/changed UI, describe what you'd expect to see
     and check the rendered output matches — if you have a way to
     take a screenshot or read rendered output, use it.
   - Check the step's output against both requirements.md (does it do
     what was asked) and ui-ux-rules.md (does it look right, if UI).
3. **If you find a flaw:** fix it yourself, then re-verify. Do not move
   to the next step with a known bug still open.
4. **If it's clean:** commit and push (see Section 2), then immediately
   continue to the next step in steps.md.
5. **Do not ask "should I continue?"** between steps. Keep going through
   the entire steps.md list end-to-end. Only stop for the conditions in
   Section 4.

This is a loop, not a checklist you report back on after each item —
work through it autonomously and only surface back to me at a stop
condition or at true completion.

## 1. Do's

- DO re-read requirements.md and ui-ux-rules.md before any step that
  touches business logic or UI, respectively — don't rely on memory of
  what they said several steps ago.
- DO keep steps small. If a step in steps.md feels too large to verify
  properly in one pass, break it into smaller sub-steps yourself and
  verify each one.
- DO comment non-obvious logic, especially anything related to the
  agent's tool-calling loop and SQL validation — this code needs to be
  explainable in an interview.
- DO keep secrets (API keys, DB connection strings) in `.env` files
  that are gitignored — never hardcode them, never commit them.
- DO write a short note in the commit message about what was verified,
  not just what was built (e.g. "Add generate_sql tool — tested against
  3 sample questions, handles unknown column gracefully").
- DO flag clearly, in the chat (not silently), any point where a
  free-tier limit might realistically be at risk (e.g. "this approach
  would call the Gemini API on every keystroke — I'm debouncing it to
  stay well within free-tier rate limits").
- DO keep the reasoning-trace / self-correction behavior visibly honest
  — if the agent retries a query, that should show in the trace, not
  be hidden.

## 2. Git — micro-commit, every verified step

- After EVERY step in steps.md is built and verified (not before), run:
  ```
  git add .
  git commit -m "<short, specific description of what this step did and that it was verified>"
  git push
  ```
- Commit messages should be specific and readable by a human reviewing
  history later — not "update" or "fix stuff." Examples:
  - "Add profile_data tool with schema + null-count summary, tested on demo CSV"
  - "Add ChatBubble component with light/dark tokens, verified against ui-ux-rules.md section 8"
- Never batch multiple unrelated steps into one commit.
- Never push code that fails to build/run — verification (Section
  "core workflow" step 2) happens BEFORE commit, always.
- The remote is already set up:
  `git@github.com:vedjr02/InsightPilot.git` on branch `main`.

## 3. Don'ts

- DON'T introduce any paid service, API, or tier without asking me
  first and explaining why the free tier isn't sufficient.
- DON'T let the AI-generated SQL execute against the database without
  passing through `validate_sql` first — no exceptions, even for
  "obviously safe" queries.
- DON'T write raw user input or raw AI output directly into a SQL
  string — always validate/parameterize per requirements.md Section 6.
- DON'T add features not in requirements.md's scope (auth, billing,
  live data, file types beyond CSV) — flag it to me instead of building it.
- DON'T default to generic AI-UI patterns (gradient blobs, glassmorphism,
  unstyled shadcn, purple-to-blue backgrounds) — re-check ui-ux-rules.md
  Section 10 if unsure.
- DON'T silently skip a verification step because "it's probably fine."
  If you can't verify something (e.g. no way to actually run the
  frontend in this environment), say so explicitly rather than
  assuming success.
- DON'T fabricate test results, screenshots, or API responses. If
  something wasn't actually run/checked, say that plainly.
- DON'T rewrite or refactor earlier steps' code as a side effect of a
  later step without flagging it — note it in the commit message and,
  if it's a meaningful change, tell me directly.

## 4. Stop conditions — the ONLY times you pause and wait for me

Stop the loop and ask me directly when:

1. **An external account/credential is needed** — e.g. you need me to
   actually create the Neon DB and paste the connection string, or
   generate the Gemini API key, or confirm a Vercel/Render deployment
   login. You cannot create these accounts yourself.
2. **A genuine design/product decision isn't covered by requirements.md**
   — e.g. an ambiguity that would change user-facing behavior in a way
   the requirements don't specify. Don't guess on product decisions;
   guess on implementation details.
3. **A free-tier limit is genuinely about to be exceeded** and there's
   no reasonable workaround.
4. **You've completed every step in steps.md** — at true completion,
   stop, summarize what was built, list anything that still needs
   manual action (e.g. "you need to add your Gemini API key to Render's
   environment variables"), and wait.
5. **Something in requirements.md or ui-ux-rules.md conflicts with
   itself or with reality** (e.g. a free-tier feature that doesn't
   actually exist) — flag it rather than silently picking one interpretation.

Outside of these five conditions: keep going. Don't stop after each
step to report progress or ask permission — that defeats the purpose
of the loop.
