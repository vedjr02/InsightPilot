"""InsightPilot FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by the frontend connection probe."""
    return {"status": "ok"}
