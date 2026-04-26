from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryRewriteRequest(BaseModel):
    content: str = Field(..., min_length=120, max_length=80000)
    instruction: str = Field(..., min_length=5, max_length=4000)
    preserve_plot: bool = True
    preserve_length: bool = True
    target_tone: str | None = Field(default=None, max_length=80)
    target_audience: str | None = Field(default=None, max_length=80)
    language: str | None = Field(default=None, max_length=20)

    @field_validator("content", "instruction")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field is required")
        return cleaned

    @field_validator("target_tone", "target_audience", "language")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class StoryRewriteResponse(BaseModel):
    success: bool
    provider: str
    latency_ms: int
    rewritten_content: str
    moderation: dict
    meta: dict | None = None
    error: str | None = None
