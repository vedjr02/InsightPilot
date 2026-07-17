"""Agent orchestration loop — plans tools, retries SQL, returns structured answer."""

from __future__ import annotations

from typing import Any, Callable

from app.intent import (
    chat_reply,
    classify_intent,
    refuse_reply,
    schema_terms_from_profile,
)
from app.llm import LLMBusyError, friendly_error_message
from app.tools.choose_chart_type import choose_chart_type
from app.tools.execute_query import execute_query
from app.tools.generate_sql import generate_sql
from app.tools.profile_data import profile_data
from app.tools.validate_sql import validate_sql
from app.tools.write_insight import write_insight

StatusCallback = Callable[[str], None]

MAX_SQL_ATTEMPTS = 3


def _text_only_response(
    question: str,
    dataset_id: str,
    reply: str,
    trace: list[dict[str, Any]],
    *,
    chart_reason: str,
) -> dict[str, Any]:
    return {
        "ok": True,
        "question": question,
        "dataset_id": dataset_id,
        "insight": reply,
        "empty_result": False,
        "chart": {
            "chart_type": "empty",
            "config": {},
            "reason": chart_reason,
        },
        "sql": None,
        "columns": [],
        "rows": [],
        "row_count": 0,
        "trace": trace,
        "attempts": 0,
    }


def run_agent(
    question: str,
    dataset_id: str,
    *,
    on_status: StatusCallback | None = None,
) -> dict[str, Any]:
    """Run the full analysis loop for one user question.

    Returns text + chart config + reasoning trace + optional SQL.
    """

    def status(msg: str) -> None:
        if on_status:
            on_status(msg)

    trace: list[dict[str, Any]] = []

    def add_trace(tool: str, detail: str, **extra: Any) -> None:
        step = {"tool": tool, "detail": detail, **extra}
        trace.append(step)

    # 0. Profile early — schema-aware intent + analysis
    status("Profiling data…")
    try:
        profile = profile_data(dataset_id)
    except Exception as exc:  # noqa: BLE001
        return _error_response(
            question,
            f"I couldn’t load that dataset’s profile ({exc}).",
            trace,
        )

    dataset_name = profile.get("name")
    intent = classify_intent(
        question,
        schema_terms=schema_terms_from_profile(profile),
    )

    if intent == "chat":
        status("Replying…")
        reply = chat_reply(question, dataset_name)
        add_trace(
            "intent",
            "Treated as conversation (not a data question) — skipped SQL.",
            intent="chat",
        )
        status("Done")
        return _text_only_response(
            question,
            dataset_id,
            reply,
            trace,
            chart_reason="Conversational reply — no chart",
        )

    if intent == "off_topic":
        status("Replying…")
        reply = refuse_reply(dataset_name)
        add_trace(
            "intent",
            "Off-topic — refused; only dataset questions are answered.",
            intent="off_topic",
        )
        status("Done")
        return _text_only_response(
            question,
            dataset_id,
            reply,
            trace,
            chart_reason="Off-topic — no chart",
        )

    add_trace(
        "profile_data",
        profile["summary"],
        table_name=profile["table_name"],
        row_count=profile["row_count"],
    )

    # 2–4. Generate → validate → execute, with self-correction
    sql_final: str | None = None
    result: dict[str, Any] | None = None
    prior_error: str | None = None

    for attempt in range(1, MAX_SQL_ATTEMPTS + 1):
        status("Writing query…" if attempt == 1 else "Trying a different approach…")
        if attempt > 1:
            add_trace(
                "self_correct",
                f"First attempt didn’t work, trying a different approach… (attempt {attempt}/{MAX_SQL_ATTEMPTS})",
                prior_error=prior_error,
            )

        try:
            gen = generate_sql(question, profile, prior_error=prior_error)
        except LLMBusyError as exc:
            add_trace("generate_sql", str(exc), attempt=attempt, ok=False)
            return _error_response(question, friendly_error_message(exc), trace)
        except Exception as exc:  # noqa: BLE001
            prior_error = str(exc)
            add_trace("generate_sql", f"Model error: {exc}", attempt=attempt, ok=False)
            continue

        add_trace(
            "generate_sql",
            f"Drafted SQL (attempt {attempt})",
            sql=gen["sql"],
            attempt=attempt,
        )

        status("Validating query…")
        validation = validate_sql(gen["sql"], profile)
        if not validation["ok"]:
            prior_error = validation["error"]
            add_trace(
                "validate_sql",
                validation["error"],
                sql=gen["sql"],
                ok=False,
                attempt=attempt,
            )
            continue

        add_trace(
            "validate_sql",
            "SQL passed read-only and schema checks",
            sql=validation["sql"],
            ok=True,
            attempt=attempt,
        )

        status("Running query…")
        result = execute_query(validation["sql"])
        if not result["ok"]:
            prior_error = result.get("error") or "Query failed"
            add_trace(
                "execute_query",
                prior_error,
                sql=validation["sql"],
                ok=False,
                attempt=attempt,
            )
            result = None
            continue

        sql_final = validation["sql"]
        add_trace(
            "execute_query",
            f"Returned {result['row_count']} row(s)",
            sql=sql_final,
            ok=True,
            row_count=result["row_count"],
            attempt=attempt,
        )
        break

    if result is None or sql_final is None:
        return _error_response(
            question,
            "I couldn’t answer that after a few attempts — try rephrasing, "
            "or check that the category/date names match what’s in the data.",
            trace,
            sql=None,
        )

    # Treat all-null single-metric results as empty for UX
    if (
        result["row_count"] == 1
        and len(result["columns"]) == 1
        and result["rows"][0].get(result["columns"][0]) is None
    ):
        result = {
            **result,
            "rows": [],
            "row_count": 0,
        }

    # 5. Chart
    status("Choosing chart…")
    chart = choose_chart_type(question, result["columns"], result["rows"])
    add_trace("choose_chart_type", chart["reason"], chart_type=chart["chart_type"])

    # 6. Insight
    status("Writing insight…")
    try:
        insight = write_insight(
            question,
            result["columns"],
            result["rows"],
            chart_type=chart["chart_type"],
        )
        add_trace("write_insight", "Drafted plain-English answer")
    except LLMBusyError as exc:
        # Keep SQL + chart; fall back to a plain summary if the model is busy.
        add_trace("write_insight", friendly_error_message(exc), ok=False)
        insight = {
            "insight": (
                f"Here’s what the data shows for “{question}” "
                f"({result['row_count']} row(s)). "
                "The AI writer is busy, so this is a short summary — "
                "retry in a few seconds for a fuller explanation."
            ),
            "empty": result["row_count"] == 0,
        }
    except Exception as exc:  # noqa: BLE001
        add_trace("write_insight", f"Model error: {exc}", ok=False)
        insight = {
            "insight": (
                f"Query returned {result['row_count']} row(s). "
                "I couldn’t draft a full narrative — see the chart and "
                "“Run this SQL yourself” for details."
            ),
            "empty": result["row_count"] == 0,
        }

    status("Done")
    return {
        "ok": True,
        "question": question,
        "dataset_id": dataset_id,
        "insight": insight["insight"],
        "empty_result": bool(insight.get("empty")) or result["row_count"] == 0,
        "chart": chart,
        "sql": sql_final,
        "columns": result["columns"],
        "rows": result["rows"],
        "row_count": result["row_count"],
        "trace": trace,
        "attempts": sum(1 for t in trace if t["tool"] == "generate_sql"),
    }


def _error_response(
    question: str,
    message: str,
    trace: list[dict[str, Any]],
    sql: str | None = None,
) -> dict[str, Any]:
    return {
        "ok": False,
        "question": question,
        "insight": message,
        "empty_result": False,
        "chart": {"chart_type": "empty", "config": {}, "reason": "error"},
        "sql": sql,
        "columns": [],
        "rows": [],
        "row_count": 0,
        "trace": trace,
        "error": message,
    }
