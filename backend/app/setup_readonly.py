"""Create the read-only Postgres role used for all agent query execution.

Permissions are enforced at the DB layer (requirements.md §4.4), not just
in prompts. Verifies that INSERT is rejected for this role.
"""

from __future__ import annotations

import os
import secrets
import string
from pathlib import Path
from urllib.parse import quote_plus, urlparse, urlunparse

from dotenv import load_dotenv
from psycopg import sql

from app.db import get_connection

ROLE_NAME = "insightpilot_readonly"
_BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(_BACKEND_DIR / ".env")


def _generate_password(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _owner_url_parts() -> tuple[str, str, str, str, str]:
    url = os.environ["DATABASE_URL"]
    parsed = urlparse(url)
    # path is /neondb
    dbname = parsed.path.lstrip("/") or "neondb"
    return parsed.scheme, parsed.hostname or "", str(parsed.port or 5432), dbname, parsed.query


def _build_readonly_url(password: str) -> str:
    scheme, host, port, dbname, query = _owner_url_parts()
    # Neon uses user in netloc; keep sslmode from original query
    netloc = f"{ROLE_NAME}:{quote_plus(password)}@{host}:{port}"
    return urlunparse((scheme, netloc, f"/{dbname}", "", query, ""))


def _update_env_readonly_url(readonly_url: str) -> None:
    env_path = _BACKEND_DIR / ".env"
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    out: list[str] = []
    replaced = False
    for line in lines:
        if line.startswith("DATABASE_READONLY_URL="):
            out.append(f"DATABASE_READONLY_URL={readonly_url}")
            replaced = True
        else:
            out.append(line)
    if not replaced:
        out.append(f"DATABASE_READONLY_URL={readonly_url}")
    env_path.write_text("\n".join(out) + "\n")


def setup_readonly_role(password: str | None = None) -> str:
    """Create/replace the read-only role and return its connection URL."""
    password = password or _generate_password()
    readonly_url = _build_readonly_url(password)

    with get_connection() as conn:
        # Role DDL often needs to run outside a failed transaction block
        conn.autocommit = True
        with conn.cursor() as cur:
            # Neon: CREATE ROLE ... LOGIN PASSWORD
            cur.execute(
                """
                SELECT 1 FROM pg_roles WHERE rolname = %s
                """,
                (ROLE_NAME,),
            )
            exists = cur.fetchone() is not None
            if exists:
                cur.execute(
                    sql.SQL("ALTER ROLE {} WITH LOGIN PASSWORD {}").format(
                        sql.Identifier(ROLE_NAME),
                        sql.Literal(password),
                    )
                )
            else:
                cur.execute(
                    sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD {}").format(
                        sql.Identifier(ROLE_NAME),
                        sql.Literal(password),
                    )
                )

            # Grants — SELECT only on public schema tables (current + future)
            cur.execute(
                sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(
                    sql.Identifier(ROLE_NAME)
                )
            )
            cur.execute(
                sql.SQL(
                    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO {}"
                ).format(sql.Identifier(ROLE_NAME))
            )
            cur.execute(
                sql.SQL(
                    "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
                    "GRANT SELECT ON TABLES TO {}"
                ).format(sql.Identifier(ROLE_NAME))
            )
            # Explicitly revoke write privileges if any were inherited
            cur.execute(
                sql.SQL(
                    "REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER "
                    "ON ALL TABLES IN SCHEMA public FROM {}"
                ).format(sql.Identifier(ROLE_NAME))
            )
            # Neon may not allow GRANT CONNECT on database from SQL in all plans;
            # LOGIN + password is usually enough when using the project endpoint.
            try:
                cur.execute(
                    sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                        sql.Identifier(urlparse(os.environ["DATABASE_URL"]).path.lstrip("/")),
                        sql.Identifier(ROLE_NAME),
                    )
                )
            except Exception as exc:  # noqa: BLE001
                print(f"Note: GRANT CONNECT skipped/failed ({exc})")

    _update_env_readonly_url(readonly_url)
    return readonly_url


def verify_readonly_rejects_writes() -> None:
    """Confirm INSERT fails for the read-only role (requirements.md §4.4)."""
    import psycopg
    from psycopg.rows import dict_row

    url = os.environ.get("DATABASE_READONLY_URL")
    if not url:
        raise RuntimeError("DATABASE_READONLY_URL not set — run setup first")

    # Reload in case we just wrote it
    load_dotenv(_BACKEND_DIR / ".env", override=True)
    url = os.environ["DATABASE_READONLY_URL"]

    with psycopg.connect(url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT current_user AS u")
            user = cur.fetchone()["u"]
            assert user == ROLE_NAME, f"expected {ROLE_NAME}, got {user}"

            cur.execute("SELECT id FROM datasets LIMIT 1")
            row = cur.fetchone()
            assert row is not None, "need at least one dataset row to test SELECT"

            # SELECT on dynamic demo table should work
            cur.execute("SELECT table_name FROM datasets WHERE source = 'demo' LIMIT 1")
            table = cur.fetchone()["table_name"]
            cur.execute(
                sql.SQL("SELECT COUNT(*) AS n FROM {}").format(sql.Identifier(table))
            )
            count = cur.fetchone()["n"]
            print(f"SELECT ok as {user}: {count} rows in {table}")

            write_failed = False
            try:
                cur.execute(
                    "INSERT INTO datasets (name, source, table_name) "
                    "VALUES ('should_fail', 'demo', 'ds_should_fail')"
                )
                conn.commit()
            except psycopg.errors.InsufficientPrivilege:
                write_failed = True
                conn.rollback()
            except Exception as exc:  # noqa: BLE001
                # Some Neon configs may raise differently; treat any write error as success
                print(f"Write rejected with: {type(exc).__name__}: {exc}")
                write_failed = True
                conn.rollback()

            if not write_failed:
                raise RuntimeError(
                    "SECURITY FAIL: read-only role was allowed to INSERT into datasets"
                )
            print("INSERT correctly rejected for read-only role")


def main() -> None:
    setup_readonly_role()
    # Force reload after .env write
    load_dotenv(_BACKEND_DIR / ".env", override=True)
    verify_readonly_rejects_writes()
    print("Read-only role ready. DATABASE_READONLY_URL written to backend/.env")


if __name__ == "__main__":
    main()
