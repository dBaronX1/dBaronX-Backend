from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryDiscoverySignalRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=120, max_length=120000)
    prompt: str | None = Field(default=None, max_length=8000)
    language: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = Field(default=None, max_length=40)
    historical_ctr: float | None = Field(default=None, ge=0.0, le=1.0)
    completion_rate: float | None = Field(default=None, ge=0.0, le=1.0)
    save_rate: float | None = Field(default=None, ge=0.0, le=1.0)
    share_rate: float | None = Field(default=None, ge=0.0, le=1.0)
    recency_hours: int | None = Field(default=None, ge=0, le=100000)
    comparison_contents: list[str] | None = Field(default=None, max_length=50)

    @field_validator("title", "content")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
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
    def normalize_comparisons(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized: list[str] = []
        for index, item in enumerate(value):
            cleaned = item.strip()
            if not cleaned:
                raise ValueError(f"comparison_contents[{index}] is empty")
            normalized.append(cleaned)
        return normalized


class StoryDiscoverySignalResponse(BaseModel):
    success: bool
    ranking: dict
    signals: dict
    supporting: dict
