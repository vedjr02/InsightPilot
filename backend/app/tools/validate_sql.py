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

    # Column allowlist — skip SQL keywords / aliases heuristically
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
        table_name.lower(),
    }
    # Identifiers that look like columns (not string literals / numbers)
    candidates = set(
        re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\b", cleaned)
    )
    unknown = []
    for tok in candidates:
        low = tok.lower()
        if low in _SQL_WORDS:
            continue
        if low in allowed_columns:
            continue
        # Likely an alias or CTE name — allow if defined with AS alias pattern later
        # For safety, only reject tokens that appear in contexts suggesting columns
        # and are clearly not aliases: if token matches a known bad pattern skip soft
        unknown.append(tok)

    # Soft column check: only fail if an unknown token matches nothing we can
    # explain as alias. Aliases are hard; we reject only when a token is used
    # that looks like a misspelled known column (edit distance) — keep strict:
    # reject unknown identifiers that aren't aliases introduced via AS.
    aliases = {
        m.group(1).lower()
        for m in re.finditer(
            r"\bAS\s+([a-zA-Z_][a-zA-Z0-9_]*)", cleaned, flags=re.IGNORECASE
        )
    }
    # Also bare alias forms: expr alias (hard); stick to AS aliases + CTE names
    cte_names = {
        m.group(1).lower()
        for m in re.finditer(
            r"\bWITH\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\b",
            cleaned,
            flags=re.IGNORECASE,
        )
    }
    allowed_extra = aliases | cte_names

    bad_cols = [
        t
        for t in unknown
        if t.lower() not in allowed_extra
        and t.lower() not in allowed_columns
        and not t.lower().startswith("col")
    ]
    # Filter function-like / common aggregate aliases people invent
    # Only hard-fail when token is similar to a real column misspelling OR
    # clearly not an alias. Practical approach for demos: hard-fail tokens that
    # appear after WHERE/GROUP BY/ORDER BY / SELECT list and aren't allowed.
    # Simpler reliable check used here: if any unknown token is a close miss
    # of a column name, fail; otherwise allow (aliases).
    strict_bad = []
    for t in bad_cols:
        low = t.lower()
        if low in allowed_extra:
            continue
        # If it's exactly an unknown and appears as "table.col" already handled
        # Reject if it looks like a column reference people would use from schema
        # but isn't in schema — e.g. common mistakes
        if any(_similar(low, c) for c in allowed_columns):
            strict_bad.append(t)

    if strict_bad:
        return {
            "ok": False,
            "error": (
                "Unknown column(s) not in profiled schema: "
                + ", ".join(sorted(set(strict_bad)))
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


def _similar(a: str, b: str) -> bool:
    """True if a looks like a typo of b (same length ±1, few edits) — cheap check."""
    if a == b:
        return False
    if abs(len(a) - len(b)) > 2:
        return False
    # Shared prefix heuristic for misspellings like reveue / revenue
    if len(a) >= 4 and (a[:3] == b[:3] or a[-3:] == b[-3:]):
        return True
    return False


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
