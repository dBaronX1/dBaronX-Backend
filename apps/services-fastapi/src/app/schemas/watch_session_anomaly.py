from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class WatchSessionAnomalyRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    declared_duration_seconds: int = Field(..., ge=1, le=86400)
    heartbeat_intervals_ms: list[int] = Field(default_factory=list, max_length=10000)
    total_heartbeats: int = Field(..., ge=0, le=100000)
    hidden_event_count: int = Field(default=0, ge=0, le=100000)
    blur_event_count: int = Field(default=0, ge=0, le=100000)
    seek_event_count: int = Field(default=0, ge=0, le=100000)
    playback_rate_max: float = Field(default=1.0, ge=0.25, le=5.0)
    muted_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    duplicate_claim_attempts: int = Field(default=0, ge=0, le=100000)

    @field_validator("session_id")
    @classmethod
    def normalize_session_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("session_id is required")
        return cleaned


class WatchSessionAnomalyResponse(BaseModel):
    success: bool
    session_anomaly: dict
