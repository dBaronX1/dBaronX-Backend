from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryCardPayloadRequest(BaseModel):
    story_id: str = Field(..., min_length=1, max_length=120)
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=120, max_length=120000)
    excerpt: str | None = Field(default=None, max_length=5000)
    genre: str | None = Field(default=None, max_length=60)
    tone: str | None = Field(default=None, max_length=60)
    audience: str | None = Field(default=None, max_length=60)
    cover_image_url: str | None = Field(default=None, max_length=2000)
    creator_id: str | None = Field(default=None, max_length=120)
    creator_name: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = Field(default=None, max_length=20)
    published_at: str | None = Field(default=None, max_length=80)
    slug: str | None = Field(default=None, max_length=120)
    visibility: str = Field(default="public", max_length=40)
    status: str = Field(default="published", max_length=40)
    promotion_state: str | None = Field(default=None, max_length=40)
    affiliate_eligible: bool = False
    ad_eligible: bool = False

    @field_validator(
        "story_id",
        "title",
        "content",
        "excerpt",
        "genre",
        "tone",
        "audience",
        "cover_image_url",
        "creator_id",
        "creator_name",
        "published_at",
        "slug",
        "visibility",
        "status",
        "promotion_state",
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


class StoryCardPayloadResponse(BaseModel):
    success: bool
    card: dict
