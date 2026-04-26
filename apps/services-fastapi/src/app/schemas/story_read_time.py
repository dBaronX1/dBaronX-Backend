from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryReadTimeRequest(BaseModel):
    content: str = Field(..., min_length=50, max_length=120000)
    language: str | None = Field(default=None, max_length=20)
    words_per_minute: int | None = Field(default=None, ge=120, le=350)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower()
        return cleaned or None


class StoryReadTimeResponse(BaseModel):
    success: bool
    reading_time: dict
    metrics: dict
