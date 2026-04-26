from __future__ import annotations

from typing import Any, Literal

from pydantic import Field, field_validator

from app.schemas.common import DBXBaseModel

PlaybackEventType = Literal[
    "session_started",
    "heartbeat",
    "visibility_hidden",
    "visibility_visible",
    "pause",
    "play",
    "ended",
    "claim_attempt",
]


class WatchSessionEvidence(DBXBaseModel):
    event_type: PlaybackEventType
    at_second: float = Field(ge=0)
    client_timestamp: str | None = None
    server_received_at: str | None = None
    visible: bool = True
    muted: bool = False
    playback_rate: float = Field(default=1.0, ge=0.25, le=4.0)
    tab_focused: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class WatchValidationRequest(DBXBaseModel):
    user_id: str
    ad_id: str
    session_id: str
    captcha_verified: bool = False
    ip: str | None = None
    user_agent: str | None = None
    fingerprint: str | None = None
    request_id: str | None = None
    referral_code: str | None = None
    tier: str | None = None
    claimed_duration_seconds: int = Field(ge=0)
    client_started_at: str | None = None
    client_completed_at: str | None = None
    expected_min_duration_seconds: int = Field(ge=1, default=20)
    heartbeat_interval_seconds: int = Field(ge=1, le=30, default=5)
    completion_token: str | None = None
    events: list[WatchSessionEvidence] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("tier")
    @classmethod
    def normalize_tier(cls, value: str | None) -> str | None:
        return value.lower() if value else value


class WatchValidationSummary(DBXBaseModel):
    total_events: int = Field(ge=0)
    heartbeat_count: int = Field(ge=0)
    visible_heartbeat_count: int = Field(ge=0)
    hidden_heartbeat_count: int = Field(ge=0)
    play_event_count: int = Field(ge=0)
    pause_event_count: int = Field(ge=0)
    ended_event_present: bool = False
    continuity_ratio: float = Field(ge=0, le=1)
    evidence_duration_seconds: float = Field(ge=0)
    max_playback_rate: float = Field(ge=0.25)
    suspicious_flags: list[str] = Field(default_factory=list)


class WatchValidationResult(DBXBaseModel):
    allowed: bool
    score: float = Field(ge=0)
    level: Literal["low", "medium", "high", "critical"]
    reason: str
    session_id: str
    user_id: str
    ad_id: str
    summary: WatchValidationSummary
    signals: list[dict[str, Any]] = Field(default_factory=list)
    should_enqueue_review: bool = False
    next_eligible_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
