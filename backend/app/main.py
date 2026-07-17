"""InsightPilot FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.datasets import router as datasets_router

app = FastAPI(title="InsightPilot API", version="0.1.0")

# Allow the Next.js frontend (local + Vercel) to call the API during Phase 0+.
# Origins can be tightened once deployment URLs are fixed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets_router)


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
