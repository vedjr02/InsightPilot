"""Intent gate: chat, data analysis, or refuse off-topic questions."""

from __future__ import annotations

import re
from typing import Iterable, Literal

Intent = Literal["chat", "analyze", "off_topic"]

# Exact / near-exact conversational phrases — no SQL.
_CHAT_EXACT = {
    "hi",
    "hello",
    "hey",
    "yo",
    "sup",
    "hiya",
    "howdy",
    "thanks",
    "thank you",
    "thx",
    "ty",
    "ok",
    "okay",
    "cool",
    "nice",
    "great",
    "good",
    "bye",
    "goodbye",
    "good morning",
    "good afternoon",
    "good evening",
    "good night",
    "who are you",
    "what are you",
    "what can you do",
    "what do you do",
    "help",
    "help me",
    "how does this work",
    "how do you work",
}

_CHAT_PREFIXES = (
    "hi ",
    "hello ",
    "hey ",
    "thanks ",
    "thank you",
    "who are you",
    "what can you",
    "what do you",
    "how do you",
    "how does this",
)

# Strong BI / data signals — bare "what/why/who" alone is NOT enough.
_ANALYZE_SIGNALS = re.compile(
    r"\b("
    r"how many|how much|show|compare|trend|trends|"
    r"top|best|worst|rank|ranking|average|avg|mean|median|"
    r"sum|total|count|break.?down|distribution|correlate|correlation|"
    r"revenue|profit|sales|orders?|return(?:s|ed)?|segment|region|category|"
    r"sub.?category|channel|tier|quantity|price|cost|"
    r"month|monthly|daily|weekly|yearly|quarter|yoy|mom|"
    r"dip|spike|churn|vs|versus|between|over time|"
    r"list|find|analyze|analyse|plot|chart|insight|metric|kpi|"
    r"performance|dataset|columns?|schema|rows?|"
    r"group by|by region|by category|by segment|by month"
    r")\b",
    re.IGNORECASE,
)

# Obvious non-data topics — refuse even if a weak word overlaps.
_OFF_TOPIC = re.compile(
    r"\b("
    r"weather|joke|poem|story|recipe|cook|pasta|president|capital|"
    r"football|cricket|soccer|nba|movie|song|lyrics|"
    r"code (?:me|this|for)|write (?:me )?(?:a |an )?(?:poem|story|essay|email)|"
    r"translate|homework|girlfriend|boyfriend|dating|"
    r"bitcoin|crypto|stock tip|lottery"
    r")\b|"
    r"\bwhat(?:'s| is) (?:2\s*\+\s*2|the weather|the time)\b|"
    r"\bwho (?:is|won|was) (?:the )?(?:president|prime minister)\b",
    re.IGNORECASE,
)


def _normalize(question: str) -> str:
    return " ".join(question.strip().lower().split())


def _schema_hit(text: str, schema_terms: Iterable[str] | None) -> bool:
    if not schema_terms:
        return False
    for term in schema_terms:
        t = str(term).strip().lower()
        if len(t) < 3:
            continue
        # Word-ish match so "or" from "order" doesn't false-positive alone
        if re.search(rf"\b{re.escape(t)}\b", text):
            return True
    return False


def schema_terms_from_profile(profile: dict | None) -> list[str]:
    """Column names + sample cell values the user might mention."""
    if not profile:
        return []
    terms: list[str] = []
    name = profile.get("name")
    if name:
        terms.extend(str(name).replace("_", " ").split())
    for col in profile.get("columns") or []:
        cname = col.get("name")
        if cname:
            terms.append(str(cname))
            terms.extend(str(cname).replace("_", " ").split())
    for row in profile.get("sample_rows") or []:
        for v in row.values():
            if v is None:
                continue
            s = str(v).strip()
            if 2 < len(s) <= 40 and not s.replace(".", "", 1).isdigit():
                terms.append(s)
    # Dedupe, keep shorter list
    seen: set[str] = set()
    out: list[str] = []
    for t in terms:
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(t)
    return out


def classify_intent(
    question: str,
    *,
    schema_terms: Iterable[str] | None = None,
) -> Intent:
    """Return 'chat', 'analyze', or 'off_topic'."""
    q = _normalize(question)
    if not q:
        return "chat"

    bare = q.rstrip("!?.,;: ")

    if bare in _CHAT_EXACT:
        return "chat"

    if len(bare) <= 40 and any(
        bare.startswith(p.strip()) or bare == p.strip() for p in _CHAT_PREFIXES
    ):
        if not _ANALYZE_SIGNALS.search(bare) and not _schema_hit(bare, schema_terms):
            return "chat"

    if _OFF_TOPIC.search(bare):
        return "off_topic"

    if _ANALYZE_SIGNALS.search(bare) or _schema_hit(bare, schema_terms):
        return "analyze"

    # Real questions with no data link → refuse (don't invent SQL).
    return "off_topic"


def chat_reply(question: str, dataset_name: str | None = None) -> str:
    """Friendly reply for greetings / product help — no fabricated numbers."""
    q = question.strip().lower()
    name = dataset_name or "this dataset"

    if any(w in q for w in ("thank", "thx", "ty")):
        return (
            "You’re welcome. Ask whenever you’re ready — for example, "
            "“What are the top categories by revenue?”"
        )

    if any(
        w in q
        for w in (
            "who are you",
            "what are you",
            "what can you",
            "what do you",
            "help",
            "how do",
        )
    ):
        return (
            f"I’m InsightPilot, an autonomous business analyst for {name}. "
            "Ask a question about the data in plain English and I’ll write SQL, "
            "run it, pick a chart, and explain the answer — with a visible "
            "reasoning trace. Try: “Why did Electronics revenue dip in March?”"
        )

    return (
        f"Hi — I’m InsightPilot. I analyze {name} when you ask a real "
        "business question (trends, rankings, segments, dips). "
        "Try something like “Which segment has the highest return rate?”"
    )


def refuse_reply(dataset_name: str | None = None) -> str:
    """Clear refusal for questions unrelated to the loaded data."""
    name = dataset_name or "the loaded dataset"
    return (
        "I’m not made to answer that. I can only answer questions related to "
        f"{name} — trends, rankings, segments, dips, and other patterns in the "
        "data. Try something like “What are the top categories by revenue?”"
    )
