"""Agent tool: execute_query — run validated SQL via the read-only role."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.db import get_database_url

# requirements.md §4.4
QUERY_TIMEOUT_MS = 5000


def _jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def execute_query(sql: str) -> dict[str, Any]:
    """Execute validated SQL with the read-only role and a statement timeout.

    Never call this with unvalidated SQL.
    """
    url = get_database_url(readonly=True)
    try:
        with psycopg.connect(url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # statement_timeout cannot be parameterized; value is our int constant
                cur.execute(f"SET statement_timeout = {int(QUERY_TIMEOUT_MS)}")
                cur.execute(sql)
                if cur.description is None:
                    return {
                        "ok": True,
                        "columns": [],
                        "rows": [],
                        "row_count": 0,
                    }
                columns = [d.name for d in cur.description]
                raw_rows = cur.fetchall()
                rows = [{k: _jsonable(v) for k, v in dict(r).items()} for r in raw_rows]
                return {
                    "ok": True,
                    "columns": columns,
                    "rows": rows,
                    "row_count": len(rows),
                }
    except Exception as exc:  # noqa: BLE001 — surface to agent for self-correction
        return {
            "ok": False,
            "error": str(exc),
            "error_type": type(exc).__name__,
            "columns": [],
            "rows": [],
            "row_count": 0,
        }
