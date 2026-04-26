from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryContinuationRequest(BaseModel):
    existing_content: str = Field(..., min_length=100, max_length=40000)
    continuation_instruction: str = Field(..., min_length=3, max_length=4000)
    genre: str = Field(default="fiction", min_length=2, max_length=60)
    tone: str = Field(default="engaging", min_length=2, max_length=60)
    language: str = Field(default="en", min_length=2, max_length=20)
    target_word_count: int = Field(default=700, ge=150, le=3000)

    @field_validator("existing_content", "continuation_instruction", "genre", "tone", "language")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field is required")
        return cleaned


class StoryContinuationResponse(BaseModel):
    success: bool
    provider: str
    model: str | None = None
    latency_ms: int | None = None
    continuation: str
    moderation: dict
