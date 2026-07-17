"""Agent tool: choose_chart_type — pick viz from result-set shape."""

from __future__ import annotations

from typing import Any


def choose_chart_type(
    question: str,
    columns: list[str],
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    """Decide bar / line / pie / single-stat / table from the result shape."""
    if not rows:
        return {
            "chart_type": "empty",
            "config": {"message": "No rows returned"},
            "reason": "Query returned no rows",
        }

    if len(rows) == 1 and len(columns) == 1:
        col = columns[0]
        return {
            "chart_type": "stat",
            "config": {
                "label": col,
                "value": rows[0].get(col),
            },
            "reason": "Single numeric/stat result",
        }

    if len(rows) == 1 and len(columns) <= 3:
        # Single row with a few metrics → stat cards (use first numeric-ish)
        return {
            "chart_type": "stat",
            "config": {
                "label": columns[0],
                "value": rows[0].get(columns[0]),
                "extras": {c: rows[0].get(c) for c in columns[1:]},
            },
            "reason": "Single-row summary",
        }

    # Infer x/y: prefer date-like column for x, numeric for y
    x_col = columns[0]
    y_col = columns[1] if len(columns) > 1 else columns[0]

    q = question.lower()
    date_like = next(
        (
            c
            for c in columns
            if any(k in c.lower() for k in ("date", "month", "year", "week", "day"))
        ),
        None,
    )
    numeric_cols = [
        c
        for c in columns
        if c != (date_like or x_col)
        and _mostly_numeric([r.get(c) for r in rows])
    ]

    if date_like and numeric_cols:
        return {
            "chart_type": "line",
            "config": {"x": date_like, "y": numeric_cols[0]},
            "reason": "Time-series shape detected",
        }

    if any(k in q for k in ("trend", "over time", "monthly", "daily", "weekly")):
        x = date_like or x_col
        y = numeric_cols[0] if numeric_cols else y_col
        return {
            "chart_type": "line",
            "config": {"x": x, "y": y},
            "reason": "Question asks for a trend",
        }

    if any(k in q for k in ("share", "proportion", "percentage", "breakdown of")) and len(rows) <= 8:
        label = x_col
        value = numeric_cols[0] if numeric_cols else y_col
        return {
            "chart_type": "pie",
            "config": {"label": label, "value": value},
            "reason": "Part-to-whole question with few categories",
        }

    # Top-N / categorical → horizontal bar
    if len(rows) <= 25 and len(columns) >= 2:
        label = x_col
        value = numeric_cols[0] if numeric_cols else y_col
        return {
            "chart_type": "bar",
            "config": {"x": value, "y": label, "orientation": "horizontal"},
            "reason": "Categorical breakdown / top-N shape",
        }

    return {
        "chart_type": "table",
        "config": {"columns": columns},
        "reason": "Fallback to table for complex result shape",
    }


def _mostly_numeric(values: list[Any]) -> bool:
    non_null = [v for v in values if v is not None]
    if not non_null:
        return False
    ok = 0
    for v in non_null:
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            ok += 1
        else:
            try:
                float(v)
                ok += 1
            except (TypeError, ValueError):
                pass
    return ok / len(non_null) >= 0.8
