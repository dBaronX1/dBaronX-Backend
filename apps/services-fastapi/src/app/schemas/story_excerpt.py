from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryExcerptRequest(BaseModel):
    content: str = Field(..., min_length=60, max_length=50000)
    title_hint: str | None = Field(default=None, max_length=200)
    max_words: int = Field(default=45, ge=20, le=80)
    genre: str | None = Field(default=None, max_length=60)
    tone: str | None = Field(default=None, max_length=60)
    language: str | None = Field(default=None, max_length=20)

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    @field_validator("title_hint", "genre", "tone", "language")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryExcerptResponse(BaseModel):
    success: bool
    excerpt: str
    teaser: str
    word_count: int
    character_count: int
    title: str
