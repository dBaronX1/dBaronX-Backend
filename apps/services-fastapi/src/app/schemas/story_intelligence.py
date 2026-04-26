from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class StoryClassificationRequest(BaseModel):
    title: str = ""
    content: str
    genre: str = "fiction"
    tone: str = "engaging"
    language: str = "en"

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 10:
            raise ValueError("content too short")
        return cleaned


class StoryClassificationResponse(BaseModel):
    success: bool
    classification: dict[str, Any]


class StoryModerationRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("text required")
        return cleaned


class StoryModerationResponse(BaseModel):
    success: bool
    moderation: dict[str, Any]


class StoryEnrichmentRequest(BaseModel):
    title: str = ""
    content: str
    genre: str = "fiction"
    tone: str = "engaging"
    language: str = "en"
    existing_texts: list[str] = Field(default_factory=list)


class StoryEnrichmentResponse(BaseModel):
    success: bool
    excerpt: str
    tags: list[str]
    slug: str
    moderation: dict[str, Any]
    signals: dict[str, Any]
    duplicate_analysis: dict[str, Any]
    promotional_copy: dict[str, Any]


class StoryPromptEnhancementRequest(BaseModel):
    prompt: str
    genre: str = "fiction"
    tone: str = "engaging"
    language: str = "en"

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError("prompt too short")
        return cleaned


class StoryPromptEnhancementResponse(BaseModel):
    success: bool
    original_prompt: str
    enhanced_prompt: str
    guidance: dict[str, Any]
