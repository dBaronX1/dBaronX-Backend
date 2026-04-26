from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryRecommendationSignalsRequest(BaseModel):
    title: str
    excerpt: str
    content: str
    genre: str = "fiction"
    tone: str = "engaging"
    language: str = "en"
    tags: list[str] = Field(default_factory=list)

    @field_validator("title", "excerpt", "content")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field is required")
        return cleaned


class StoryRecommendationSignalsResponse(BaseModel):
    success: bool
    signals: dict
