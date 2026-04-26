from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class StoryDuplicateDetectionRequest(BaseModel):
    content: str = Field(..., min_length=120, max_length=120000)
    comparison_contents: list[str] = Field(..., min_length=1, max_length=100)
    threshold: float = Field(default=0.86, ge=0.5, le=0.99)

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    @field_validator("comparison_contents")
    @classmethod
    def normalize_comparison_contents(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        for index, value in enumerate(values):
            cleaned = value.strip()
            if not cleaned:
                raise ValueError(f"comparison_contents[{index}] is empty")
            normalized.append(cleaned)
        return normalized


class StoryDuplicateDetectionResponse(BaseModel):
    success: bool
    duplicate_found: bool
    threshold: float
    source_fingerprint: str
    best_match: dict | None = None
    comparisons: list[dict]
