from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class WatchSessionStartRequest(BaseModel):
    user_id: str | None = None
    ad_id: str
    session_id: str | None = None

    ip: str | None = None
    user_agent: str | None = None
    fingerprint: str | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("ad_id")
    @classmethod
    def validate_ad_id(cls, value: str) -> str:
        v = value.strip()
        if not v:
            raise ValueError("ad_id required")
        return v


class WatchHeartbeatEvent(BaseModel):
    timestamp: int = Field(ge=0)
    visible: bool = True
    playback_rate: float = Field(default=1.0, ge=0.0)


class WatchHeartbeatRequest(BaseModel):
    session_id: str
    events: list[WatchHeartbeatEvent] = Field(min_length=1)

    ip: str | None = None
    user_agent: str | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)


class WatchSessionFinalizeRequest(BaseModel):
    session_id: str
    captcha_verified: bool = False

    ip: str | None = None
    user_agent: str | None = None
    fingerprint: str | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)


class WatchSessionState(BaseModel):
    session_id: str
    ad_id: str
    user_id: str | None = None

    started_at: int
    last_event_at: int

    total_duration: int = 0
    visible_duration: int = 0

    visible_events: int = 0
    hidden_events: int = 0

    playback_rate_max: float = 1.0

    captcha_verified: bool = False
    finalized: bool = False

    fraud_flags: list[str] = Field(default_factory=list)

    metadata: dict[str, Any] = Field(default_factory=dict)


class WatchSessionResult(BaseModel):
    success: bool
    session_id: str
    reward_eligible: bool
    reason: str
    duration_seconds: int
    visible_seconds: int
    risk_score: float
    risk_level: str
