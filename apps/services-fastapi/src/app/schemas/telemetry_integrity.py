from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class TelemetryIntegrityRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    headers: dict = Field(...)
    ip: str = Field(..., min_length=3, max_length=100)
    account_id: str | None = Field(default=None, max_length=120)
    declared_duration_seconds: int = Field(..., ge=1, le=86400)
    heartbeat_intervals_ms: list[int] = Field(default_factory=list, max_length=10000)
    total_heartbeats: int = Field(..., ge=0, le=100000)
    hidden_event_count: int = Field(default=0, ge=0, le=100000)
    blur_event_count: int = Field(default=0, ge=0, le=100000)
    seek_event_count: int = Field(default=0, ge=0, le=100000)
    playback_rate_max: float = Field(default=1.0, ge=0.25, le=5.0)
    muted_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    duplicate_claim_attempts: int = Field(default=0, ge=0, le=100000)
    recent_ip_events: list[dict] | None = None
    distinct_accounts_24h: int = Field(default=0, ge=0, le=100000)
    failed_captcha_1h: int = Field(default=0, ge=0, le=100000)
    denied_watch_claims_24h: int = Field(default=0, ge=0, le=100000)

    @field_validator("session_id", "ip", "account_id")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if cleaned == "":
            return None
        return cleaned


class TelemetryIntegrityResponse(BaseModel):
    success: bool
    integrity: dict
