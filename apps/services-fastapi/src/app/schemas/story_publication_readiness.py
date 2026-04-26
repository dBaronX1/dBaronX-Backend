from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryPublicationReadinessRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=120, max_length=120000)
    prompt: str | None = Field(default=None, max_length=8000)
    comparison_contents: list[str] | None = Field(default=None, max_length=50)
    language: str | None = Field(default=None, max_length=20)
    require_excerpt: bool = True
    require_summary: bool = True

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


class StoryPublicationReadinessResponse(BaseModel):
    success: bool
    publication_ready: bool
    promotion_ready: bool
    quality: dict
    checks: list[dict]
    blocking_issues: list[str]
    warnings: list[str]
    metadata: dict
    excerpt: str
    recommended_actions: list[str]
