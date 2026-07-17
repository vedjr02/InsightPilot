"""Database connection helpers for InsightPilot.

Owner connection (DATABASE_URL) is used for schema setup, ingestion, and
profiling. Query execution against user/agent SQL must use the read-only
role (DATABASE_READONLY_URL) once Step 7 creates it.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator, Iterator

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

# Load backend/.env regardless of process cwd (uvicorn vs scripts).
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))


def get_database_url(*, readonly: bool = False) -> str:
    """Return the owner or read-only connection string."""
    if readonly:
        url = os.getenv("DATABASE_READONLY_URL") or os.getenv("DATABASE_URL")
    else:
        url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add it to backend/.env (see .env.example)."
        )
    return url


@contextmanager
def get_connection(*, readonly: bool = False) -> Iterator[psycopg.Connection]:
    """Yield a psycopg connection; always closed on exit."""
    conn = psycopg.connect(get_database_url(readonly=readonly), row_factory=dict_row)
    try:
        yield conn
        if not readonly:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def check_connection() -> dict:
    """Smoke-test the owner DB connection; used by /health later."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT current_database() AS database, current_user AS user, "
                "NOW() AS server_time"
            )
            row = cur.fetchone()
            assert row is not None
            return {
                "database": row["database"],
                "user": row["user"],
                "server_time": row["server_time"].isoformat(),
            }
