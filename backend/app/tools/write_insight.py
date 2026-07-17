"""Agent tool: write_insight — plain-English explanation of the result."""

from __future__ import annotations

import json
from typing import Any

from app.llm import generate_text


def write_insight(
    question: str,
    columns: list[str],
    rows: list[dict[str, Any]],
    *,
    chart_type: str | None = None,
) -> dict[str, Any]:
    """Write a concise, trustworthy answer from the query result."""
    if not rows:
        text = (
            "That query returned no rows — try widening the date range "
            "or check the exact category name."
        )
        return {"insight": text, "empty": True}

    # Cap payload sent to the model to protect free-tier tokens
    preview_rows = rows[:30]
    payload = {
        "question": question,
        "chart_type": chart_type,
        "columns": columns,
        "row_count": len(rows),
        "rows_preview": preview_rows,
    }

    prompt = f"""You are InsightPilot, a careful business analyst.
Given the question and SQL result below, write a plain-English answer.

Rules:
- Be specific and grounded in the numbers shown — cite key figures
- 2–4 short sentences max
- Only suggest a next action when the data genuinely supports it
- Never invent columns or values not present in the result
- No markdown headings; plain prose only

Data:
{json.dumps(payload, default=str)}
"""

    insight = generate_text(prompt)
    return {"insight": insight, "empty": False}
