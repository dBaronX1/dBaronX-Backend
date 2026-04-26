from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class CreatorPromotionRiskRequest(BaseModel):
    creator_account_id: str = Field(..., min_length=1, max_length=120)
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=120, max_length=120000)
    creator_profile: dict = Field(...)
    target_channel: str = Field(..., min_length=1, max_length=40)
    proposed_spend_amount: float = Field(..., ge=0.0, le=1000000000.0)
    prompt: str | None = Field(default=None, max_length=8000)
    language: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = Field(default=None, max_length=40)
    comparison_contents: list[str] | None = Field(default=None, max_length=50)
    market_context: dict | None = None
    story_promotion_count_30d: int = Field(default=0, ge=0, le=1000000)
    creator_chargebacks_365d: int = Field(default=0, ge=0, le=1000000)
    average_story_spend_90d: float | None = Field(default=None, ge=0.0, le=1000000000.0)

    @field_validator(
        "creator_account_id",
        "title",
        "content",
        "target_channel",
        "prompt",
        "language",
    )
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


class CreatorPromotionRiskResponse(BaseModel):
    success: bool
    creator_promotion_risk: dict
