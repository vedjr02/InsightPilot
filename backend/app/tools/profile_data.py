"""Agent tool: profile_data."""

from __future__ import annotations

import uuid
from typing import Any

from app.services.datasets import get_dataset


def profile_data(dataset_id: str) -> dict[str, Any]:
    """Return schema + summary stats for the active dataset.

    Tool #1 in requirements.md §4.2. The agent calls this before generating
    SQL so it knows real column names and types.
    """
    try:
        uid = uuid.UUID(dataset_id)
    except ValueError as exc:
        raise ValueError(f"Invalid dataset_id: {dataset_id}") from exc

    ds = get_dataset(uid)
    if not ds:
        raise ValueError(f"Dataset not found: {dataset_id}")

    profile = ds.get("profile") or {}
    columns = profile.get("columns") or []

    return {
        "dataset_id": ds["id"],
        "name": ds["name"],
        "source": ds["source"],
        "table_name": ds["table_name"],
        "row_count": ds["row_count"],
        "column_count": profile.get("column_count", len(columns)),
        "columns": columns,
        "sample_rows": profile.get("sample_rows", []),
        "summary": _human_summary(ds, columns),
    }


def _human_summary(ds: dict[str, Any], columns: list[dict[str, Any]]) -> str:
    col_bits = [f"{c['name']} ({c['type']})" for c in columns[:8]]
    more = "" if len(columns) <= 8 else f" and {len(columns) - 8} more"
    return (
        f"Dataset “{ds['name']}” has {ds['row_count']} rows and "
        f"{len(columns)} columns: {', '.join(col_bits)}{more}."
    )
