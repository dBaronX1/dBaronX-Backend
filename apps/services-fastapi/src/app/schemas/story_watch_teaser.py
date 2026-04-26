from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryWatchTeaserRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    excerpt: str = Field(..., min_length=20, max_length=3000)
    genre: str | None = Field(default=None, max_length=60)
    tone: str | None = Field(default=None, max_length=60)
    teaser_seconds: int = Field(default=15, ge=5, le=30)

    @field_validator("title", "excerpt")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned

    @field_validator("genre", "tone")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryWatchTeaserResponse(BaseModel):
    success: bool
    watch_teaser: dict
