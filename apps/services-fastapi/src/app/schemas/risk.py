from __future__ import annotations

from typing import Any, Literal

from pydantic import Field, field_validator

from app.schemas.common import DBXBaseModel, DeviceSummary, GeoSummary

RiskDecision = Literal["allow", "review", "block"]
RiskLevel = Literal["low", "medium", "high", "critical"]


class VelocityWindow(DBXBaseModel):
    key: str
    count: int = Field(ge=0)
    limit: int = Field(ge=1)
    window_seconds: int = Field(ge=1)
    exceeded: bool


class RiskSignal(DBXBaseModel):
    code: str
    category: str
    score: float = Field(ge=0)
    weight: float = Field(ge=0, default=1.0)
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    blocking: bool = False


class RiskContext(DBXBaseModel):
    event_type: str
    user_id: str | None = None
    email: str | None = None
    ip: str | None = None
    user_agent: str | None = None
    request_id: str | None = None
    idempotency_key: str | None = None
    fingerprint: str | None = None
    session_id: str | None = None
    order_id: str | None = None
    ad_id: str | None = None
    affiliate_code: str | None = None
    amount: float | None = Field(default=None, ge=0)
    currency: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    geo: GeoSummary | None = None
    device: DeviceSummary | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class RiskAssessmentRequest(DBXBaseModel):
    event_type: Literal["checkout", "affiliate", "ad_watch", "payout", "ai_generation"]
    user_id: str | None = None
    email: str | None = None
    ip: str | None = None
    user_agent: str | None = None
    request_id: str | None = None
    idempotency_key: str | None = None
    fingerprint: str | None = None
    session_id: str | None = None
    amount: float | None = Field(default=None, ge=0)
    currency: str | None = None
    order_id: str | None = None
    ad_id: str | None = None
    duration: int | None = Field(default=None, ge=0)
    affiliate_code: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RiskAssessmentResult(DBXBaseModel):
    allowed: bool
    decision: RiskDecision
    level: RiskLevel
    score: float = Field(ge=0)
    reason: str
    signals: list[RiskSignal] = Field(default_factory=list)
    velocity_windows: list[VelocityWindow] = Field(default_factory=list)
    request_id: str | None = None
    fingerprint: str | None = None
    geo: GeoSummary | None = None
    device: DeviceSummary | None = None
    cached: bool = False
    dependency_degraded: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class CheckoutRiskRequest(RiskAssessmentRequest):
    event_type: Literal["checkout"] = "checkout"
    items: list[dict[str, Any]] = Field(default_factory=list)
    shipping_address: dict[str, Any] | None = None
    billing_address: dict[str, Any] | None = None


class AffiliateRiskRequest(RiskAssessmentRequest):
    event_type: Literal["affiliate"] = "affiliate"


class AdWatchRiskRequest(RiskAssessmentRequest):
    event_type: Literal["ad_watch"] = "ad_watch"
    ad_id: str
    duration: int = Field(ge=0)


class PayoutRiskRequest(RiskAssessmentRequest):
    event_type: Literal["payout"] = "payout"
    amount: float = Field(gt=0)
    destination: str | None = None


class AiGenerationRiskRequest(RiskAssessmentRequest):
    event_type: Literal["ai_generation"] = "ai_generation"
    prompt: str = Field(min_length=1, max_length=25000)
    provider_preference: str | None = None
