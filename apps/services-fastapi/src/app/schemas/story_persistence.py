from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class StoryGenerationJobCreateRequest(BaseModel):
    user_id: str | None = None
    prompt: str
    genre: str = "fiction"
    tone: str = "engaging"
    language: str = "en"
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError("prompt too short")
        return cleaned


class StoryGenerationJobStateRequest(BaseModel):
    metadata: dict[str, Any] = Field(default_factory=dict)


class StoryCreateRequest(BaseModel):
    user_id: str | None = None
    title: str
    slug: str
    prompt: str = ""
    content: str
    excerpt: str
    genre: str = "fiction"
    tone: str = "engaging"
    language: str = "en"
    provider: str
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("title", "slug", "content", "excerpt", "provider")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field is required")
        return cleaned


class ModerationLogCreateRequest(BaseModel):
    story_id: str | None = None
    user_id: str | None = None
    allowed: bool
    flags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class PersistenceResponse(BaseModel):
    success: bool
    record: dict[str, Any]
