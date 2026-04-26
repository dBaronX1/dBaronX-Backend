from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryModerationRequest(BaseModel):
    content: str = Field(..., min_length=40, max_length=50000)
    title: str | None = Field(default=None, max_length=200)
    prompt: str | None = Field(default=None, max_length=5000)

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    @field_validator("title", "prompt")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryModerationResponse(BaseModel):
    success: bool
    blocked: bool
    requires_review: bool
    severity: str
    safety_score: float
    blocked_flags: list[str]
    review_flags: list[str]
    safe_for_public_discovery: bool
    safe_for_affiliate_promotion: bool
    safe_for_watch_to_earn_promotion: bool
