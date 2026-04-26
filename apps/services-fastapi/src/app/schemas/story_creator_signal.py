from __future__ import annotations

from pydantic import BaseModel, Field


class StoryCreatorSignalRequest(BaseModel):
    total_published: int = Field(..., ge=0, le=1000000)
    publication_acceptance_rate: float = Field(..., ge=0.0, le=1.0)
    moderation_rejection_rate: float = Field(..., ge=0.0, le=1.0)
    average_story_quality_score: float = Field(..., ge=0.0, le=100.0)
    average_completion_rate: float | None = Field(default=None, ge=0.0, le=1.0)
    average_share_rate: float | None = Field(default=None, ge=0.0, le=1.0)
    average_save_rate: float | None = Field(default=None, ge=0.0, le=1.0)
    recent_policy_flags: int = Field(default=0, ge=0, le=1000)
    days_since_first_publish: int | None = Field(default=None, ge=0, le=20000)


class StoryCreatorSignalResponse(BaseModel):
    success: bool
    creator_signals: dict
    components: dict
