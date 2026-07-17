"""Ask endpoints — sync JSON and SSE streaming with live status updates."""

from __future__ import annotations

import json
import queue
import threading
from typing import Iterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agent import run_agent
from app.llm import friendly_error_message
from app.services.datasets import get_dataset

router = APIRouter(prefix="/ask", tags=["ask"])


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    dataset_id: str


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("")
def ask(body: AskRequest) -> dict:
    """Non-streaming ask (scripts / curl)."""
    if not get_dataset(body.dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty")
    return run_agent(question, body.dataset_id)


@router.post("/stream")
def ask_stream(body: AskRequest) -> StreamingResponse:
    """SSE: `status` events while working, then `result`, then `done`."""
    if not get_dataset(body.dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty")

    def generate() -> Iterator[str]:
        events: queue.Queue = queue.Queue()

        def worker() -> None:
            try:
                result = run_agent(
                    question,
                    body.dataset_id,
                    on_status=lambda m: events.put(("status", m)),
                )
                events.put(("result", result))
            except Exception as exc:  # noqa: BLE001
                events.put(
                    (
                        "result",
                        {
                            "ok": False,
                            "insight": friendly_error_message(exc),
                            "trace": [],
                            "chart": {
                                "chart_type": "empty",
                                "config": {},
                                "reason": "error",
                            },
                            "sql": None,
                            "columns": [],
                            "rows": [],
                            "row_count": 0,
                            "question": question,
                            "error": friendly_error_message(exc),
                        },
                    )
                )
            finally:
                events.put(("done", None))

        threading.Thread(target=worker, daemon=True).start()

        while True:
            kind, payload = events.get()
            if kind == "status":
                yield _sse("status", {"message": payload})
            elif kind == "result":
                yield _sse("result", payload)
            elif kind == "done":
                yield _sse("done", {})
                break

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
