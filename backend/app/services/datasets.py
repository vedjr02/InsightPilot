"""Dataset repository helpers."""

from __future__ import annotations

import uuid
from typing import Any

from app.db import get_connection


def list_datasets() -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, source, table_name, row_count, original_filename,
                       created_at, profile
                FROM datasets
                ORDER BY
                    CASE WHEN source = 'demo' THEN 0 ELSE 1 END,
                    created_at DESC
                """
            )
            rows = cur.fetchall()
    return [_serialize(r) for r in rows]


def get_dataset(dataset_id: uuid.UUID | str) -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, source, table_name, row_count, original_filename,
                       created_at, profile
                FROM datasets
                WHERE id = %s
                """,
                (str(dataset_id),),
            )
            row = cur.fetchone()
    return _serialize(row) if row else None


def get_demo_dataset() -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, source, table_name, row_count, original_filename,
                       created_at, profile
                FROM datasets
                WHERE source = 'demo'
                ORDER BY created_at DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
    return _serialize(row) if row else None


def _serialize(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "source": row["source"],
        "table_name": row["table_name"],
        "row_count": row["row_count"],
        "original_filename": row["original_filename"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "profile": row["profile"],
    }
