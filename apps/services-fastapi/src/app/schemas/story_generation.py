from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=8000)
    genre: str | None = Field(default=None, max_length=80)
    tone: str | None = Field(default=None, max_length=80)
    language: str | None = Field(default=None, max_length=20)
    target_words: int = Field(default=900, ge=250, le=5000)
    title_hint: str | None = Field(default=None, max_length=200)
    audience: str | None = Field(default=None, max_length=80)

    @field_validator("prompt")
    @classmethod
    def normalize_prompt(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("prompt is required")
        return cleaned

    @field_validator("genre", "tone", "language", "title_hint", "audience")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryGenerationResponse(BaseModel):
    success: bool
    provider: str
    latency_ms: int
    story: str
    moderation: dict | None = None
    metadata: dict | None = None
    meta: dict | None = None
    error: str | None = None
