from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryTeaserVariantRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    excerpt: str = Field(..., min_length=20, max_length=3000)
    genre: str | None = Field(default=None, max_length=60)
    tone: str | None = Field(default=None, max_length=60)
    audience: str | None = Field(default=None, max_length=60)
    cta_target: str = Field(default="read_now", max_length=40)
    max_variants: int = Field(default=4, ge=1, le=5)

    @field_validator("title", "excerpt")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned

    @field_validator("genre", "tone", "audience", "cta_target")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryTeaserVariantResponse(BaseModel):
    success: bool
    variants: list[dict]
