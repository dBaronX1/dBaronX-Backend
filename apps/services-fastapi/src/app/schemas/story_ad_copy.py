from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryAdCopyRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=120, max_length=80000)
    objective: str = Field(default="clicks", max_length=40)
    language: str | None = Field(default=None, max_length=20)
    prompt: str | None = Field(default=None, max_length=8000)

    @field_validator("title", "content")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned

    @field_validator("objective", "language", "prompt")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryAdCopyResponse(BaseModel):
    success: bool
    provider: str
    copy: dict
    latency_ms: int
    moderation: dict
    meta: dict | None = None
    error: str | None = None
