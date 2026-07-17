"""HTTP routes for dataset listing, upload, and profile access."""

from __future__ import annotations

import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.datasets import get_dataset, get_demo_dataset, list_datasets
from app.services.ingestion import ingest_csv

router = APIRouter(prefix="/datasets", tags=["datasets"])

# Free-tier friendly upload cap (requirements.md §4.1)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.get("")
def get_datasets() -> dict:
    return {"datasets": list_datasets()}


@router.get("/demo")
def demo_dataset() -> dict:
    ds = get_demo_dataset()
    if not ds:
        raise HTTPException(status_code=404, detail="No demo dataset loaded. Run: python -m app.load_demo")
    return ds


@router.get("/{dataset_id}")
def dataset_detail(dataset_id: str) -> dict:
    try:
        uid = uuid.UUID(dataset_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid dataset id") from exc
    ds = get_dataset(uid)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return ds


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {MAX_UPLOAD_BYTES // (1024 * 1024)}MB",
        )

    # Persist to a temp file for the shared CSV reader
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)

    try:
        name = Path(file.filename).stem.replace("_", " ").strip() or "Uploaded dataset"
        result = ingest_csv(
            tmp_path,
            name=name,
            source="upload",
            original_filename=file.filename,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    return result
