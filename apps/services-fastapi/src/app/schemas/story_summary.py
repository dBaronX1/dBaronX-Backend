from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StorySummaryRequest(BaseModel):
    content: str = Field(..., min_length=120, max_length=80000)
    summary_style: str = Field(default="standard", max_length=40)
    target_sentences: int = Field(default=4, ge=1, le=12)
    language: str | None = Field(default=None, max_length=20)
    spoiler_safe: bool = False

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    @field_validator("summary_style", "language")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StorySummaryResponse(BaseModel):
    success: bool
    provider: str
    summary: str
    latency_ms: int
    moderation: dict
    meta: dict | None = None
    error: str | None = None
