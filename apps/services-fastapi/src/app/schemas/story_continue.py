from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryContinueRequest(BaseModel):
    content: str = Field(..., min_length=120, max_length=80000)
    continuation_prompt: str | None = Field(default=None, max_length=4000)
    target_words: int = Field(default=250, ge=80, le=1200)
    language: str | None = Field(default=None, max_length=20)
    maintain_style: bool = True

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    @field_validator("continuation_prompt", "language")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryContinueResponse(BaseModel):
    success: bool
    provider: str
    latency_ms: int
    continuation: str
    moderation: dict
    meta: dict | None = None
    error: str | None = None
