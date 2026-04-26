from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryGenerationJobRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=8000)
    genre: str | None = Field(default=None, max_length=80)
    tone: str | None = Field(default=None, max_length=80)
    language: str | None = Field(default=None, max_length=20)
    target_words: int = Field(default=900, ge=250, le=5000)
    title_hint: str | None = Field(default=None, max_length=200)
    audience: str | None = Field(default=None, max_length=80)
    request_id: str | None = Field(default=None, max_length=120)
    user_id: str | None = Field(default=None, max_length=120)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("prompt is required")
        return cleaned

    @field_validator(
        "genre",
        "tone",
        "language",
        "title_hint",
        "audience",
        "request_id",
        "user_id",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryGenerationJobResponse(BaseModel):
    success: bool
    job_id: str
    fingerprint: str
    latency_ms: int
    result: dict
    meta: dict | None = None
