"""Thin Gemini client wrapper — keeps free-tier usage deliberate."""

from __future__ import annotations

import os
import time
from functools import lru_cache

from dotenv import load_dotenv
from google import genai

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))

# Prefer flash-lite for free-tier headroom; override via env if needed.
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

# Tried in order when the primary model is overloaded / unavailable.
_FALLBACK_RAW = os.getenv(
    "GEMINI_FALLBACK_MODELS",
    "gemini-2.0-flash,gemini-flash-latest,gemini-2.5-flash",
)
FALLBACK_MODELS = [m.strip() for m in _FALLBACK_RAW.split(",") if m.strip()]

_MAX_ATTEMPTS_PER_MODEL = 3
_BASE_DELAY_SEC = 1.2

_BUSY_MARKERS = (
    "503",
    "429",
    "unavailable",
    "high demand",
    "resource_exhausted",
    "resource exhausted",
    "rate limit",
    "quota",
    "overloaded",
    "temporarily",
)


class LLMBusyError(RuntimeError):
    """Gemini is temporarily overloaded / rate-limited after retries."""


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
    return genai.Client(api_key=key)


def _is_transient(exc: BaseException) -> bool:
    text = str(exc).lower()
    code = getattr(exc, "code", None)
    if code in (408, 429, 500, 502, 503, 504):
        return True
    return any(m in text for m in _BUSY_MARKERS)


def _model_chain(primary: str | None) -> list[str]:
    first = primary or DEFAULT_MODEL
    out: list[str] = []
    for m in [first, *FALLBACK_MODELS]:
        if m and m not in out:
            out.append(m)
    return out


def generate_text(prompt: str, *, model: str | None = None) -> str:
    """Generate text with retries + model fallbacks for transient Gemini errors."""
    client = get_client()
    last_exc: BaseException | None = None

    for model_name in _model_chain(model):
        for attempt in range(1, _MAX_ATTEMPTS_PER_MODEL + 1):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                text = (response.text or "").strip()
                if not text:
                    raise RuntimeError("Gemini returned an empty response")
                return text
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if not _is_transient(exc) or attempt >= _MAX_ATTEMPTS_PER_MODEL:
                    break
                time.sleep(_BASE_DELAY_SEC * (2 ** (attempt - 1)))

    if last_exc is not None and _is_transient(last_exc):
        raise LLMBusyError(
            "The AI model is busy right now — please try again in a few seconds."
        ) from last_exc
    raise RuntimeError(str(last_exc) if last_exc else "Gemini call failed") from last_exc


def friendly_error_message(exc: BaseException) -> str:
    """User-facing error — never dump raw Gemini JSON."""
    if isinstance(exc, LLMBusyError):
        return str(exc)
    if _is_transient(exc):
        return (
            "The AI model is busy right now — please try again in a few seconds."
        )
    return (
        "Something went wrong while analyzing that — please try again in a moment."
    )
