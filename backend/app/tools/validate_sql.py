"""Agent tool: validate_sql — enforce read-only, schema allowlist, row cap."""

from __future__ import annotations

import re
from typing import Any

# Hard server-side row cap (requirements.md §4.4)
DEFAULT_ROW_LIMIT = 1000

_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|"
    r"COPY|CALL|EXECUTE|MERGE|REPLACE|ATTACH|DETACH|VACUUM|ANALYZE|"
    r"COMMENT|SECURITY|OWNER|SET\s+ROLE|SET\s+SESSION)\b",
    re.IGNORECASE,
)

_MULTI_STATEMENT = re.compile(r";\s*\S")


def validate_sql(
    sql: str,
    profile: dict[str, Any],
    *,
    row_limit: int = DEFAULT_ROW_LIMIT,
) -> dict[str, Any]:
    """Validate AI-generated SQL before any execution.

    Checks:
    - Single statement
    - SELECT / WITH only (no DDL/DML keywords)
    - Referenced table must be the dataset's table_name
    - Referenced columns must exist in the profiled schema (best-effort)
    - Injects/enforces a row-limit cap
    """
    if not sql or not sql.strip():
        return {"ok": False, "error": "Empty SQL", "sql": sql}

    cleaned = sql.strip().rstrip(";").strip()

    if _MULTI_STATEMENT.search(cleaned + ";"):
        # Allow trailing semicolon only
        if ";" in cleaned:
            return {
                "ok": False,
                "error": "Multiple SQL statements are not allowed",
                "sql": cleaned,
            }

    if not re.match(r"^(WITH|SELECT)\b", cleaned, re.IGNORECASE):
        return {
            "ok": False,
            "error": "Only SELECT queries (optionally WITH) are allowed",
            "sql": cleaned,
        }

    if _FORBIDDEN.search(cleaned):
        return {
            "ok": False,
            "error": "SQL contains forbidden keywords (must be read-only SELECT)",
            "sql": cleaned,
        }

    table_name = profile["table_name"]
    allowed_columns = {c["name"].lower() for c in (profile.get("columns") or [])}

    # Table allowlist: every FROM/JOIN target must be the dataset table
    # (ignore subqueries' aliases by checking identifier tokens after FROM/JOIN)
    table_refs = re.findall(
        r"\b(?:FROM|JOIN)\s+([\"']?)([a-zA-Z_][a-zA-Z0-9_]*)\1",
        cleaned,
        flags=re.IGNORECASE,
    )
    for _quote, ref in table_refs:
        if ref.lower() != table_name.lower():
            return {
                "ok": False,
                "error": (
                    f"Query references table '{ref}' which is outside the "
                    f"active dataset scope (allowed: {table_name})"
                ),
                "sql": cleaned,
            }

    if not table_refs:
        # Still require the table name to appear somewhere
        if table_name.lower() not in cleaned.lower():
            return {
                "ok": False,
                "error": f"Query must reference the dataset table '{table_name}'",
                "sql": cleaned,
            }

    # Column allowlist — skip SQL keywords / functions / aliases
    _SQL_WORDS = {
        "select",
        "from",
        "where",
        "group",
        "by",
        "order",
        "having",
        "limit",
        "offset",
        "as",
        "on",
        "and",
        "or",
        "not",
        "in",
        "is",
        "null",
        "like",
        "ilike",
        "between",
        "case",
        "when",
        "then",
        "else",
        "end",
        "join",
        "left",
        "right",
        "inner",
        "outer",
        "full",
        "cross",
        "union",
        "all",
        "distinct",
        "asc",
        "desc",
        "with",
        "over",
        "partition",
        "count",
        "sum",
        "avg",
        "min",
        "max",
        "round",
        "coalesce",
        "cast",
        "extract",
        "date_trunc",
        "true",
        "false",
        "interval",
        "date",
        "text",
        "numeric",
        "integer",
        "bigint",
        "double",
        "precision",
        "month",
        "year",
        "day",
        "float",
        "filter",
        "rows",
        "range",
        "unbounded",
        "preceding",
        "following",
        "current",
        "row",
        "percentile_cont",
        "stddev",
        "variance",
        "abs",
        "ceil",
        "floor",
        "greatest",
        "least",
        "nullif",
        "table",
        "lateral",
        table_name.lower(),
    }

    aliases = {
        m.group(1).lower()
        for m in re.finditer(
            r"\bAS\s+([a-zA-Z_][a-zA-Z0-9_]*)", cleaned, flags=re.IGNORECASE
        )
    }
    cte_names = {
        m.group(1).lower()
        for m in re.finditer(
            r"\bWITH\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\b",
            cleaned,
            flags=re.IGNORECASE,
        )
    }
    allowed_extra = aliases | cte_names

    # Strip string literals so their contents aren't treated as identifiers
    scrubbed = re.sub(r"'([^']|'')*'", "''", cleaned)
    candidates = set(re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\b", scrubbed))

    bad_cols = []
    for tok in candidates:
        low = tok.lower()
        if low in _SQL_WORDS or low in allowed_columns or low in allowed_extra:
            continue
        bad_cols.append(tok)

    if bad_cols:
        return {
            "ok": False,
            "error": (
                "Unknown column(s) not in profiled schema: "
                + ", ".join(sorted(set(bad_cols)))
            ),
            "sql": cleaned,
        }

    limited_sql = _ensure_limit(cleaned, row_limit)

    return {
        "ok": True,
        "sql": limited_sql,
        "row_limit": row_limit,
        "table_name": table_name,
    }


def _ensure_limit(sql: str, row_limit: int) -> str:
    """Inject or clamp LIMIT so results never exceed row_limit."""
    match = re.search(r"\bLIMIT\s+(\d+)\b", sql, flags=re.IGNORECASE)
    if match:
        current = int(match.group(1))
        if current > row_limit:
            return re.sub(
                r"\bLIMIT\s+\d+\b",
                f"LIMIT {row_limit}",
                sql,
                count=1,
                flags=re.IGNORECASE,
            )
        return sql
    return f"{sql}\nLIMIT {row_limit}"
