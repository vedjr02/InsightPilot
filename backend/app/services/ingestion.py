"""Load a CSV into a scoped dynamic Postgres table and register it in datasets."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Literal

from psycopg import sql

from app.db import get_connection
from app.services.profiling import (
    infer_pg_type,
    parse_value,
    profile_rows,
    read_csv_rows,
    sanitize_column_name,
)

Source = Literal["upload", "demo"]


def _table_name_for(dataset_id: uuid.UUID) -> str:
    # Must match is_safe_table_name(): starts with letter, [a-z0-9_]
    return f"ds_{dataset_id.hex}"


def ingest_csv(
    path: Path,
    *,
    name: str,
    source: Source,
    original_filename: str | None = None,
) -> dict[str, Any]:
    """Create a dynamic table, bulk-load rows, profile, and register the dataset."""
    headers, rows = read_csv_rows(path)
    if not rows:
        raise ValueError("CSV contains no data rows")

    used: set[str] = set()
    column_map = {h: sanitize_column_name(h, used) for h in headers}
    pg_types: dict[str, str] = {}
    for original in headers:
        col = column_map[original]
        values = [r[original] for r in rows]
        pg_types[col] = infer_pg_type(values)

    dataset_id = uuid.uuid4()
    table_name = _table_name_for(dataset_id)
    profile = profile_rows(headers, rows, column_map, pg_types)

    col_defs = [
        sql.SQL("{} {}").format(sql.Identifier(col), sql.SQL(pg_types[col]))
        for col in (column_map[h] for h in headers)
    ]

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("CREATE TABLE {} ({})").format(
                    sql.Identifier(table_name),
                    sql.SQL(", ").join(col_defs),
                )
            )

            col_idents = [sql.Identifier(column_map[h]) for h in headers]
            insert = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                sql.Identifier(table_name),
                sql.SQL(", ").join(col_idents),
                sql.SQL(", ").join([sql.Placeholder()] * len(headers)),
            )
            batch = []
            for r in rows:
                batch.append(
                    tuple(
                        parse_value(r[h], pg_types[column_map[h]]) for h in headers
                    )
                )
            cur.executemany(insert, batch)

            cur.execute(
                """
                INSERT INTO datasets (
                    id, name, source, table_name, profile, row_count, original_filename
                )
                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s)
                RETURNING id, name, source, table_name, row_count, created_at
                """,
                (
                    dataset_id,
                    name,
                    source,
                    table_name,
                    json.dumps(profile, default=str),
                    len(rows),
                    original_filename or path.name,
                ),
            )
            registered = cur.fetchone()
            assert registered is not None

    return {
        "id": str(registered["id"]),
        "name": registered["name"],
        "source": registered["source"],
        "table_name": registered["table_name"],
        "row_count": registered["row_count"],
        "created_at": registered["created_at"].isoformat(),
        "profile": profile,
    }


def load_or_replace_demo(csv_path: Path, name: str = "Retail Sales 2024") -> dict[str, Any]:
    """Idempotent demo loader: drop previous demo datasets named the same, then load."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, table_name FROM datasets WHERE source = 'demo' AND name = %s",
                (name,),
            )
            existing = cur.fetchall()
            for row in existing:
                cur.execute(
                    sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(
                        sql.Identifier(row["table_name"])
                    )
                )
                cur.execute("DELETE FROM datasets WHERE id = %s", (row["id"],))

    return ingest_csv(
        csv_path,
        name=name,
        source="demo",
        original_filename=csv_path.name,
    )
