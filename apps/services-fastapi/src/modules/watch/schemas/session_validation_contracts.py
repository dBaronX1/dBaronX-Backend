from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DecisionCode(str, Enum):
    ALLOW = "allow"
    REVIEW = "review"
    REJECT = "reject"


class TelemetryIntegrityGrade(str, Enum):
    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"
    INVALID = "invalid"


class FraudEventType(str, Enum):
    SESSION_DUPLICATE = "session_duplicate"
    SESSION_OVERLAP = "session_overlap"
    HEARTBEAT_SPARSE = "heartbeat_sparse"
    HEARTBEAT_REGULARITY_ABUSE = "heartbeat_regularity_abuse"
    COMPLETION_TOO_FAST = "completion_too_fast"
    PLAYBACK_RATE_ABUSE = "playback_rate_abuse"
    FOCUS_LOSS_EXCESSIVE = "focus_loss_excessive"
    DEVICE_MISMATCH = "device_mismatch"
    GEO_VELOCITY = "geo_velocity"
    IP_CLUSTER_RISK = "ip_cluster_risk"
    CAPTCHA_FAILURE = "captcha_failure"
    DUPLICATE_REWARD_ATTEMPT = "duplicate_reward_attempt"
    CLOCK_SKEW = "clock_skew"
    PAYLOAD_TAMPERING = "payload_tampering"
    SESSION_GAP_ANOMALY = "session_gap_anomaly"
    BOT_PATTERN = "bot_pattern"


class WatchSessionAggregate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str = Field(min_length=8, max_length=128)
    user_id: str = Field(min_length=1, max_length=128)
    ad_id: str = Field(min_length=1, max_length=128)

    started_at: datetime
    last_event_at: datetime | None = None
    ended_at: datetime | None = None

    declared_duration_seconds: float = Field(ge=0)
    observed_duration_seconds: float = Field(ge=0)
    media_duration_seconds: float = Field(ge=0)

    heartbeat_count: int = Field(ge=0)
    heartbeat_expected_count: int = Field(ge=0)
    completion_ratio: float = Field(ge=0, le=5)
    average_heartbeat_gap_seconds: float | None = Field(default=None, ge=0)
    maximum_heartbeat_gap_seconds: float | None = Field(default=None, ge=0)

    playback_rate_average: float | None = Field(default=None, ge=0, le=16)
    playback_rate_max: float | None = Field(default=None, ge=0, le=16)
    focus_loss_count: int = Field(default=0, ge=0)
    visibility_hidden_seconds: float = Field(default=0, ge=0)
    mute_ratio: float = Field(default=0, ge=0, le=1)

    ip_address: str | None = Field(default=None, max_length=128)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    fingerprint_hash: str | None = Field(default=None, max_length=256)
    user_agent_hash: str | None = Field(default=None, max_length=256)

    duplicate_reward_attempts_24h: int = Field(default=0, ge=0)
    reward_count_same_ad_24h: int = Field(default=0, ge=0)
    concurrent_session_count: int = Field(default=0, ge=0)
    ip_session_count_15m: int = Field(default=0, ge=0)
    fingerprint_session_count_15m: int = Field(default=0, ge=0)

    captcha_verified: bool = False
    captcha_score: float | None = Field(default=None, ge=0, le=1)

    payload_hash: str | None = Field(default=None, max_length=256)
    raw_evidence: dict[str, Any] = Field(default_factory=dict)

    @field_validator("completion_ratio")
    @classmethod
    def _round_completion_ratio(cls, value: float) -> float:
        return round(value, 6)


class CompiledFraudSignal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: FraudEventType
    severity: int = Field(ge=1, le=100)
    risk_level: RiskLevel
    title: str = Field(min_length=3, max_length=160)
    detail: str = Field(min_length=3, max_length=2000)
    evidence: dict[str, Any] = Field(default_factory=dict)
    penalty_score: float = Field(ge=0, le=1000)


class SessionAnomalyReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    user_id: str
    ad_id: str
    generated_at: datetime
    integrity_grade: TelemetryIntegrityGrade
    signals: list[CompiledFraudSignal] = Field(default_factory=list)
    total_penalty_score: float = Field(default=0, ge=0)
    derived_metrics: dict[str, Any] = Field(default_factory=dict)

    @property
    def has_blocking_signal(self) -> bool:
        return any(signal.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL} for signal in self.signals)


class ValidationDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    user_id: str
    ad_id: str
    decision: DecisionCode
    risk_level: RiskLevel
    risk_score: float = Field(ge=0, le=100)
    payout_allowed: bool
    reward_allowed: bool
    manual_review_required: bool
    next_eligible_at: datetime | None = None
    rejection_reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    anomaly_report: SessionAnomalyReport
    settlement_reference: str | None = None
    contract_version: str = "watch-validation/v1"


class FraudEventWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    user_id: str
    ad_id: str
    event_type: FraudEventType
    risk_level: RiskLevel
    severity: int = Field(ge=1, le=100)
    title: str
    detail: str
    evidence: dict[str, Any] = Field(default_factory=dict)
    penalty_score: float = Field(ge=0, le=1000)
    fingerprint_hash: str | None = None
    ip_address: str | None = None
    payload_hash: str | None = None
    created_at: datetime


class FraudPersistenceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    inserted_count: int = Field(ge=0)
    deduplicated_count: int = Field(ge=0)
    failed_count: int = Field(ge=0)
    record_ids: list[str] = Field(default_factory=list)
