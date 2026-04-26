from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RiskEventSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: str | None = Field(default=None, max_length=120)
    user_id: str | None = Field(default=None, max_length=120)
    decision: str | None = Field(default=None, max_length=40)
    level: str | None = Field(default=None, max_length=40)
    from_iso: datetime | None = None
    to_iso: datetime | None = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class ManualBlockRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    block_key: str = Field(min_length=3, max_length=255)
    reason: str = Field(min_length=3, max_length=500)
    ttl_seconds: int = Field(default=3600, ge=60, le=60 * 60 * 24 * 30)
    actor_id: str | None = Field(default=None, max_length=120)
    metadata: dict = Field(default_factory=dict)


class ManualReviewDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    review_id: str = Field(min_length=3, max_length=120)
    decision: str = Field(min_length=2, max_length=40)
    actor_id: str = Field(min_length=2, max_length=120)
    note: str | None = Field(default=None, max_length=1200)
    metadata: dict = Field(default_factory=dict)
