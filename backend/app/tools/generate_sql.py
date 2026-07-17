"""Agent tool: generate_sql — NL question → candidate SELECT against known schema."""

from __future__ import annotations

import re
from typing import Any

from app.llm import generate_text


def _schema_block(profile: dict[str, Any]) -> str:
    lines = [
        f"Table name: {profile['table_name']}",
        f"Row count: {profile.get('row_count')}",
        "Columns:",
    ]
    for col in profile.get("columns") or []:
        bit = f"- {col['name']} ({col['type']})"
        if col.get("top_values"):
            tops = ", ".join(v["value"] for v in col["top_values"][:5])
            bit += f" examples: {tops}"
        if "min" in col and "max" in col:
            bit += f" range: {col['min']} .. {col['max']}"
        lines.append(bit)
    return "\n".join(lines)


def _extract_sql(text: str) -> str:
    """Pull a SQL statement out of possible markdown fences."""
    fenced = re.search(r"```(?:sql)?\s*(.*?)```", text, re.IGNORECASE | re.DOTALL)
    if fenced:
        return fenced.group(1).strip().rstrip(";")
    # Fallback: first line that looks like SELECT/WITH
    for line_block in re.split(r"\n\s*\n", text.strip()):
        cleaned = line_block.strip().rstrip(";")
        if re.match(r"^(WITH|SELECT)\b", cleaned, re.IGNORECASE):
            return cleaned
    return text.strip().rstrip(";")


def generate_sql(
    question: str,
    profile: dict[str, Any],
    *,
    prior_error: str | None = None,
) -> dict[str, Any]:
    """Generate a read-only SQL candidate for the dataset's dynamic table.

    Always pass the result through validate_sql before execute_query.
    """
    table = profile["table_name"]
    schema = _schema_block(profile)
    retry_block = ""
    if prior_error:
        retry_block = (
            "\nThe previous SQL failed with this error. Fix it:\n"
            f"{prior_error}\n"
        )

    prompt = f"""You are a careful Postgres analyst. Write ONE read-only SQL query.

Rules:
- Use ONLY this table: {table}
- Use ONLY the columns listed below — exact names, case-sensitive as given
- SELECT or WITH ... SELECT only. No INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/GRANT
- Prefer aggregations for summary questions; do not SELECT * without LIMIT
- Add LIMIT 100 if returning many rows
- Return ONLY the SQL. No commentary.

Schema:
{schema}
{retry_block}
Question: {question}
"""

    raw = generate_text(prompt)
    sql = _extract_sql(raw)
    return {
        "sql": sql,
        "raw_model_output": raw,
        "table_name": table,
        "question": question,
    }
