"""CSV profiling and type inference for InsightPilot datasets."""

from __future__ import annotations

import csv
import re
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any


SAFE_IDENT = re.compile(r"^[a-z][a-z0-9_]{0,62}$")


def sanitize_column_name(name: str, used: set[str]) -> str:
    """Turn a CSV header into a safe Postgres column identifier."""
    cleaned = re.sub(r"[^a-zA-Z0-9_]+", "_", name.strip()).strip("_").lower()
    if not cleaned or cleaned[0].isdigit():
        cleaned = f"col_{cleaned}" if cleaned else "col"
    cleaned = cleaned[:63]
    base = cleaned
    i = 2
    while cleaned in used or not SAFE_IDENT.match(cleaned):
        suffix = f"_{i}"
        cleaned = (base[: 63 - len(suffix)] + suffix).lower()
        i += 1
    used.add(cleaned)
    return cleaned


def _try_int(v: str) -> int | None:
    try:
        if v.strip() == "":
            return None
        if "." in v or "e" in v.lower():
            return None
        return int(v)
    except ValueError:
        return None


def _try_float(v: str) -> float | None:
    try:
        if v.strip() == "":
            return None
        return float(v)
    except ValueError:
        return None


def _try_date(v: str) -> date | None:
    v = v.strip()
    if not v:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    return None


def _try_bool(v: str) -> bool | None:
    low = v.strip().lower()
    if low in {"true", "t", "yes", "y"}:
        return True
    if low in {"false", "f", "no", "n"}:
        return False
    return None


def infer_pg_type(values: list[str]) -> str:
    """Infer a Postgres type from non-empty string samples."""
    non_empty = [v for v in values if v is not None and str(v).strip() != ""]
    if not non_empty:
        return "TEXT"

    if all(_try_bool(v) is not None for v in non_empty):
        return "BOOLEAN"

    if all(_try_int(v) is not None for v in non_empty):
        return "BIGINT"

    if all(_try_float(v) is not None for v in non_empty):
        return "DOUBLE PRECISION"

    if all(_try_date(v) is not None for v in non_empty):
        return "DATE"

    return "TEXT"


def parse_value(raw: str, pg_type: str) -> Any:
    if raw is None or str(raw).strip() == "":
        return None
    if pg_type == "BIGINT":
        return _try_int(raw)
    if pg_type == "DOUBLE PRECISION":
        return _try_float(raw)
    if pg_type == "DATE":
        return _try_date(raw)
    if pg_type == "BOOLEAN":
        return _try_bool(raw)
    return raw


def read_csv_rows(
    path: Path, max_rows: int | None = None
) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("CSV has no header row")
        headers = list(reader.fieldnames)
        rows: list[dict[str, str]] = []
        for i, row in enumerate(reader):
            if max_rows is not None and i >= max_rows:
                break
            rows.append({h: (row.get(h) or "") for h in headers})
    return headers, rows


def profile_rows(
    headers: list[str],
    rows: list[dict[str, str]],
    column_map: dict[str, str],
    pg_types: dict[str, str],
    sample_size: int = 5,
) -> dict[str, Any]:
    """Build the stored profile JSON for a dataset."""
    columns = []
    for original in headers:
        col = column_map[original]
        pg_type = pg_types[col]
        parsed = [parse_value(r[original], pg_type) for r in rows]
        non_null = [v for v in parsed if v is not None]
        null_count = len(parsed) - len(non_null)
        distinct = len({str(v) for v in non_null})
        col_profile: dict[str, Any] = {
            "name": col,
            "original_name": original,
            "type": pg_type,
            "null_count": null_count,
            "distinct_count": distinct,
        }
        if pg_type in {"BIGINT", "DOUBLE PRECISION"} and non_null:
            nums = [float(v) for v in non_null]
            col_profile["min"] = min(nums)
            col_profile["max"] = max(nums)
        elif pg_type == "DATE" and non_null:
            col_profile["min"] = str(min(non_null))
            col_profile["max"] = str(max(non_null))
        elif pg_type == "TEXT" and non_null:
            top = Counter(map(str, non_null)).most_common(5)
            col_profile["top_values"] = [{"value": v, "count": c} for v, c in top]
        columns.append(col_profile)

    sample_rows = []
    for r in rows[:sample_size]:
        sample = {
            column_map[h]: parse_value(r[h], pg_types[column_map[h]]) for h in headers
        }
        for k, v in list(sample.items()):
            if isinstance(v, date):
                sample[k] = v.isoformat()
        sample_rows.append(sample)

    return {
        "row_count": len(rows),
        "column_count": len(headers),
        "columns": columns,
        "sample_rows": sample_rows,
    }
