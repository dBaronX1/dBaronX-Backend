from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryQualityScoreRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=120, max_length=120000)
    prompt: str | None = Field(default=None, max_length=8000)
    comparison_contents: list[str] | None = Field(default=None, max_length=50)
    language: str | None = Field(default=None, max_length=20)

    @field_validator("title", "content")
    @classmethod
    def normalize_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned

    @field_validator("prompt", "language")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("comparison_contents")
    @classmethod
    def normalize_comparison_contents(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized: list[str] = []
        for index, item in enumerate(value):
            cleaned = item.strip()
            if not cleaned:
                raise ValueError(f"comparison_contents[{index}] is empty")
            normalized.append(cleaned)
        return normalized


class StoryQualityScoreResponse(BaseModel):
    success: bool
    score: dict
    metrics: dict
    moderation: dict
    classification: dict
    read_time: dict
    duplicate_analysis: dict | None = None
    recommendations: list[str]
