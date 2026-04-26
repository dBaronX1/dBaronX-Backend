from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryTagGenerationRequest(BaseModel):
    content: str = Field(..., min_length=60, max_length=50000)
    prompt: str | None = Field(default=None, max_length=12000)
    genre: str = Field(..., min_length=2, max_length=60)
    tone: str = Field(..., min_length=2, max_length=60)
    language: str = Field(default="en", min_length=2, max_length=20)
    title_hint: str | None = Field(default=None, max_length=200)

    @field_validator("content", "genre", "tone", "language")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field is required")
        return cleaned

    @field_validator("prompt", "title_hint")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryTagGenerationResponse(BaseModel):
    success: bool
    tags: list[str]
    primary_tag: str
    discovery_signals: dict
