from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryClassificationRequest(BaseModel):
    content: str = Field(..., min_length=80, max_length=50000)
    title: str | None = Field(default=None, max_length=200)
    prompt: str | None = Field(default=None, max_length=5000)

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    @field_validator("title", "prompt")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryClassificationResponse(BaseModel):
    success: bool
    genre: str
    tone: str
    word_count: int
    sentence_count: int
    average_sentence_length: float
    reading_complexity: str
    audience_band: str
    discoverability_segment: str
