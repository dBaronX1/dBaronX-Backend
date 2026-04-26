from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryMetadataAssemblyRequest(BaseModel):
    content: str = Field(..., min_length=120, max_length=80000)
    prompt: str | None = Field(default=None, max_length=8000)
    title: str | None = Field(default=None, max_length=200)
    language: str | None = Field(default=None, max_length=20)
    audience: str | None = Field(default=None, max_length=80)

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    @field_validator("prompt", "title", "language", "audience")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryMetadataAssemblyResponse(BaseModel):
    success: bool
    metadata: dict
    providers: dict
    signals: dict
