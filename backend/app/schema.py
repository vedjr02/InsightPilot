"""Apply InsightPilot core schema (datasets registry + helpers).

Dynamic per-dataset tables are created at ingestion time with names like
`ds_<uuid_hex>` and registered in `datasets.table_name`.
"""

from __future__ import annotations

SCHEMA_SQL = """
-- Track uploaded and demo datasets. Profile JSON is written after ingestion.
CREATE TABLE IF NOT EXISTS datasets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    source          TEXT NOT NULL CHECK (source IN ('upload', 'demo')),
    table_name      TEXT NOT NULL UNIQUE,
    profile         JSONB,
    row_count       INTEGER,
    original_filename TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS datasets_source_idx ON datasets (source);
CREATE INDEX IF NOT EXISTS datasets_created_at_idx ON datasets (created_at DESC);

-- Helper: safe identifier for dynamic table names (letters, digits, underscore).
-- Used by ingestion code; also available in SQL for admin scripts.
CREATE OR REPLACE FUNCTION is_safe_table_name(name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT name ~ '^[a-z][a-z0-9_]{0,62}$';
$$;
"""


def apply_schema() -> None:
    from app.db import get_connection

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
            # Verify datasets table exists and is empty-or-usable
            cur.execute(
                """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'datasets'
                ORDER BY ordinal_position
                """
            )
            cols = cur.fetchall()
            if not cols:
                raise RuntimeError("datasets table was not created")
            print("datasets columns:")
            for c in cols:
                print(f"  - {c['column_name']}: {c['data_type']}")


if __name__ == "__main__":
    apply_schema()
    print("Schema applied successfully.")
