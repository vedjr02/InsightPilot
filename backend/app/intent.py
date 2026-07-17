"""Cheap intent gate so greetings don't trigger the SQL/chart pipeline."""

from __future__ import annotations

import re

# Exact / near-exact conversational phrases — no Gemini call needed.
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

# Signals that this is a real data question.
_ANALYZE_SIGNALS = re.compile(
    r"\b("
    r"why|what|which|where|when|how many|how much|show|compare|trend|"
    r"top|best|worst|rank|average|avg|sum|total|count|break.?down|"
    r"revenue|profit|sales|orders|return|segment|region|category|"
    r"month|daily|weekly|yearly|dip|spike|churn|vs|versus|between|"
    r"list|find|analyze|analyse|plot|chart|over time"
    r")\b",
    re.IGNORECASE,
)


def classify_intent(question: str) -> str:
    """Return 'chat' or 'analyze'.

    Greetings and meta questions must not run SQL — that produced the
    bogus Midwest chart for \"hello\".
    """
    q = " ".join(question.strip().lower().split())
    if not q:
        return "chat"

    # Strip trailing punctuation for matching
    bare = q.rstrip("!?.,;: ")

    if bare in _CHAT_EXACT:
        return "chat"

    if len(bare) <= 24 and any(bare.startswith(p.strip()) or bare == p.strip() for p in _CHAT_PREFIXES):
        if not _ANALYZE_SIGNALS.search(bare):
            return "chat"

    # Very short with no analysis signal → chat
    if len(bare.split()) <= 3 and not _ANALYZE_SIGNALS.search(bare):
        return "chat"

    return "analyze"


def chat_reply(question: str, dataset_name: str | None = None) -> str:
    """Friendly reply for non-analysis messages — no fabricated numbers."""
    q = question.strip().lower()
    name = dataset_name or "this dataset"

    if any(w in q for w in ("thank", "thx", "ty")):
        return (
            "You’re welcome. Ask whenever you’re ready — for example, "
            "“What are the top categories by revenue?”"
        )

    if any(w in q for w in ("who are you", "what are you", "what can you", "what do you", "help", "how do")):
        return (
            f"I’m InsightPilot, an autonomous business analyst for {name}. "
            "Ask a question about the data in plain English and I’ll write SQL, "
            "run it, pick a chart, and explain the answer — with a visible "
            "reasoning trace. Try: “Why did Electronics revenue dip in March?”"
        )

    # Default greeting / small talk
    return (
        f"Hi — I’m InsightPilot. I analyze {name} when you ask a real "
        "business question (trends, rankings, segments, dips). "
        "Try something like “Which segment has the highest return rate?”"
    )
