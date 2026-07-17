"""InsightPilot FastAPI application entrypoint."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.ask import router as ask_router
from app.routes.datasets import router as datasets_router

app = FastAPI(title="InsightPilot API", version="0.1.0")


def _cors_origins() -> list[str]:
    """Local defaults plus any comma-separated CORS_ORIGINS from env (Vercel URL)."""
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    extra = os.getenv("CORS_ORIGINS", "")
    for part in extra.split(","):
        origin = part.strip().rstrip("/")
        if origin and origin not in origins:
            origins.append(origin)
    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    # Portfolio deploys land on *.vercel.app — allow those without manual CORS edits
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets_router)
app.include_router(ask_router)


@app.get("/health")
def health() -> dict:
    """Liveness check used by the frontend connection probe.

    Includes a lightweight DB ping so we catch connection issues early.
    """
    from app.db import check_connection

    try:
        db = check_connection()
        return {"status": "ok", "database": "connected", "db": db}
    except Exception as exc:  # noqa: BLE001 — surface reason to local ops only
        return {"status": "degraded", "database": "error", "detail": str(exc)}
