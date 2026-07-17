"""Chat / ask endpoint — runs the agent loop for a user question."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agent import run_agent
from app.services.datasets import get_dataset

router = APIRouter(prefix="/ask", tags=["ask"])


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    dataset_id: str


@router.post("")
def ask(body: AskRequest) -> dict:
    if not get_dataset(body.dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty")
    return run_agent(question, body.dataset_id)
