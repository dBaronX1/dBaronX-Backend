from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryPromotionCopyRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=120, max_length=80000)
    prompt: str | None = Field(default=None, max_length=8000)
    language: str | None = Field(default=None, max_length=20)
    campaign_type: str = Field(default="discovery", max_length=40)
    max_lines: int = Field(default=5, ge=2, le=8)

    @field_validator("title", "content")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned

    @field_validator("prompt", "language", "campaign_type")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryPromotionCopyResponse(BaseModel):
    success: bool
    provider: str
    copy: dict
    latency_ms: int
    moderation: dict
    meta: dict | None = None
    error: str | None = None
