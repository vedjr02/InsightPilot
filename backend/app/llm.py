"""Thin Gemini client wrapper — keeps free-tier usage deliberate."""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from google import genai

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))

# Prefer flash-lite for free-tier headroom; override via env if needed.
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
    return genai.Client(api_key=key)


def generate_text(prompt: str, *, model: str | None = None) -> str:
    """Single-shot text generation. Call sparingly — each hit counts against quota."""
    client = get_client()
    response = client.models.generate_content(
        model=model or DEFAULT_MODEL,
        contents=prompt,
    )
    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    return text
