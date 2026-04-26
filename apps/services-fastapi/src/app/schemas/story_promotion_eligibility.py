from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryPromotionEligibilityRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=120, max_length=120000)
    creator_profile: dict = Field(...)
    prompt: str | None = Field(default=None, max_length=8000)
    language: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = Field(default=None, max_length=40)
    target_channel: str = Field(default="discovery", max_length=40)
    comparison_contents: list[str] | None = Field(default=None, max_length=50)
    market_context: dict | None = None

    @field_validator("title", "content", "prompt", "language", "target_channel")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized: list[str] = []
        for index, item in enumerate(value):
            cleaned = item.strip()
            if not cleaned:
                raise ValueError(f"tags[{index}] is empty")
            normalized.append(cleaned)
        return normalized

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


class StoryPromotionEligibilityResponse(BaseModel):
    success: bool
    story_promotion_eligibility: dict
