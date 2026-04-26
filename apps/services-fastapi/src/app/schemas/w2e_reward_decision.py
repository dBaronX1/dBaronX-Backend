from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class W2ERewardDecisionRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    account_id: str = Field(..., min_length=1, max_length=120)
    headers: dict = Field(...)
    ip: str = Field(..., min_length=3, max_length=100)
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
    account_age_days: int = Field(default=0, ge=0, le=100000)
    email_verified: bool = False
    phone_verified: bool = False
    completed_orders: int = Field(default=0, ge=0, le=1000000)
    successful_watches_30d: int = Field(default=0, ge=0, le=1000000)
    denied_watches_30d: int = Field(default=0, ge=0, le=1000000)
    affiliate_payout_rejections_180d: int = Field(default=0, ge=0, le=1000000)
    chargebacks_365d: int = Field(default=0, ge=0, le=1000000)
    policy_flags_180d: int = Field(default=0, ge=0, le=1000000)
    device_count_30d: int = Field(default=1, ge=0, le=1000000)

    @field_validator("session_id", "account_id", "ip")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned


class W2ERewardDecisionResponse(BaseModel):
    success: bool
    reward_decision: dict
