from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryQualityRequest(BaseModel):
    title: str
    content: str
    excerpt: str
    tags: list[str] = Field(default_factory=list)

    @field_validator("title", "content", "excerpt")
    @classmethod
    def validate_fields(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field is required")
        return cleaned


class StoryQualityResponse(BaseModel):
    success: bool
    quality: dict
