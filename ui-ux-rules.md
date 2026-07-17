# UI/UX Rules — InsightPilot

Follow this file strictly for every frontend/UI task. This is a chat-style
analytical product, not a dashboard grid — closer in spirit to a
premium AI product (think the calm, confident feel of Apple's product
pages or a well-designed native macOS app) than to a BI tool like
Tableau or PowerBI. Keep that reference point in mind throughout.

## 1. The core interaction model
- This is conversation-first. The chat thread IS the product — treat it
  with the same care you'd give a hero section on a marketing site.
- Each agent turn is a self-contained "card" in the thread: text answer,
  optional chart, optional collapsible reasoning trace, optional SQL
  block. These sub-elements should feel like one composed unit, not
  four separate boxes stacked with gaps.
- The input box should feel calm and inviting, not like a search bar —
  generous padding, soft focus state, a subtle placeholder that rotates
  through example questions when empty.

## 2. Design tokens
- Define once in tailwind.config.ts / CSS variables: color scale
  (neutral base + one accent), spacing scale, radius scale, shadow
  scale, type scale. No hardcoded hex/px values in components.
- ONE accent color. Use it only for: the primary send button, active/
  selected states, and key data highlights in charts. Never for large
  background fills.
- Neutral base should NOT be pure white or pure black — use an
  off-white (e.g. near #FAFAF8) for light mode and a true dark charcoal
  (not pure #000) for dark mode, the way Apple's own surfaces sit
  slightly off pure white/black.
- Support light and dark mode from day one.

## 3. Typography
- Two typefaces max: a clean geometric or grotesk sans for UI/headings
  (e.g. General Sans, Inter Display, or similar) and a highly legible
  body/data face (Inter or IBM Plex Sans) for chat text and numbers.
- Tabular numerals (font-feature-settings: "tnum") on every number that
  might update, so digits don't jitter.
- Explicit type scale, no ad hoc font sizes.
- Chat text should read like well-set body copy — comfortable line
  height (1.5-1.6), max line width (~65-75 characters) even in a wide
  window, so answers don't sprawl edge-to-edge.

## 4. Motion — restrained, purposeful, Apple-style
- Every animation must explain a state change. If it's decorative, cut it.
- New agent messages: fade + slight upward slide on arrival (150-250ms,
  ease-out). Never bounce, never overshoot.
- The reasoning trace panel expands/collapses with a smooth height
  animation, not an abrupt show/hide.
- While the agent is "thinking" (calling tools), show a live, honest
  status indicator — e.g. "Profiling data…" → "Writing query…" →
  "Running query…" → "Choosing chart…" — updating in place, not a
  generic spinner. This does double duty: it's both good UX AND it's
  the transparency requirement from requirements.md.
- Charts animate in once on load, not on every re-render.
- Respect prefers-reduced-motion everywhere.

## 5. States (design all of these, not just the happy path)
- **Empty state (first load):** no blank chat box. Show the dataset
  profile summary (what's in this data) plus 3-4 clickable example
  questions.
- **Thinking state:** the live status indicator described above —
  this IS the loading state, and it should feel like watching someone
  competent work, not like waiting for a spinner.
- **Self-correction state:** when the agent retries after a failed
  query, show this honestly in the trace ("First attempt didn't work,
  trying a different approach…") rather than hiding the retry — this
  is a feature, not a bug, and hiding it wastes a genuinely impressive
  moment.
- **Error state (after retries exhausted):** plain-English, specific,
  never a raw stack trace or DB error. Suggest a rephrase.
- **Empty result state:** "That query returned no rows — try widening
  the date range or check the exact category name," not a bare blank
  chart.

## 6. Charts
- Never default Recharts/Chart.js styling — restyle gridlines (subtle,
  low-contrast), axis labels, and tooltips to match your token system.
- Tooltip cards should look like they belong to the same design system
  as the chat bubbles — same radius, same shadow, same type.
- Prefer direct labeling over legends where the chart type allows it.
- Chart choice should visibly match the question type (a trend question
  gets a line chart, a "top N" question gets a horizontal bar, a single
  number gets a large stat card, never all as a generic table by default).

## 7. Layout
- Centered, comfortably-max-width chat column (like a native chat app),
  not full-bleed edge-to-edge on large screens.
- Collapsible sidebar or minimal top bar for dataset info/switching —
  keep it out of the way of the conversation, which is the actual product.
- Mobile: input box pinned to bottom, thread scrolls, reasoning traces
  collapse by default on small screens to avoid overwhelming the view.

## 8. Component system
- Build small and reusable before building pages: ChatBubble, 
  ReasoningTrace, ChartCard, ThinkingIndicator, ExampleQuestionChip,
  StatCard, ErrorBubble.
- Every interactive element needs default/hover/active/focus-visible/
  disabled states defined.
- Visible, consistent focus rings using the accent token — accessibility
  floor, not optional.

## 9. The one signature element
Make the **thinking/reasoning-trace experience** your signature moment
— this is unique to InsightPilot and nothing else in a typical portfolio
has it. Get the live status updates, the self-correction reveal, and
the collapsible trace panel genuinely delightful to watch. Keep
everything else (chat bubbles, charts, layout) quiet and disciplined
around it.

## 10. Final Directive — Read Before Every UI Task

This must NOT look like "yet another AI-generated website." That look
has a signature by now: gradient blobs, glassmorphism-everywhere,
purple-to-blue backgrounds, a centered hero with a vague headline,
generic unstyled shadcn defaults. None of that here.

What I want instead: modern, minimalist, sleek, clean, and effective.
That means:

- Every element on the screen earns its place. If you can't say in one
  sentence why something is there, remove it.
- No overcrowding. When in doubt, cut — not add.
- No misleading elements — a status indicator shows what's actually
  happening, a chart doesn't imply more precision than the data supports.
- No unnecessary elements — no icons or illustration for decoration's sake.
- Clean does not mean plain — every remaining element is considered:
  correct spacing, correct weight, correct hierarchy.

Before showing any UI, ask: "Would this be indistinguishable from a
template I could generate for any other AI chat product?" If yes,
revise until it's specific to InsightPilot's actual purpose — a
business analyst you can trust — not generic to "chatbot UI."

If unsure whether something is polish or clutter, remove it. Three
excellent elements beat eight mediocre ones.
