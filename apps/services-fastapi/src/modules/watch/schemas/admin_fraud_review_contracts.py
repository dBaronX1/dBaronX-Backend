from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


FraudRiskLevel = Literal["low", "medium", "high", "critical"]
FraudSeverity = Literal["info", "warning", "high", "critical"]


class FraudEventListFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str | None = None
    session_id: str | None = None
    ip_address: str | None = None
    fingerprint_hash: str | None = None
    risk_level: FraudRiskLevel | None = None
    severity: FraudSeverity | None = None
    limit: int = Field(default=50, ge=1, le=200)


class FraudEventView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    session_id: str
    user_id: str | None = None
    watch_id: str | None = None
    signal_code: str
    signal_label: str
    severity: FraudSeverity
    risk_level: FraudRiskLevel
    score_delta: float
    evidence: dict[str, Any]
    ip_address: str | None = None
    fingerprint_hash: str | None = None
    created_at: datetime


class FraudEventListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool = True
    total: int = Field(ge=0)
    items: list[FraudEventView]


class FraudSessionReviewSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    user_id: str | None = None
    total_events: int = Field(ge=0)
    critical_events: int = Field(ge=0)
    high_events: int = Field(ge=0)
    total_score_delta: float = 0.0
    highest_risk_level: FraudRiskLevel = "low"
    first_event_at: datetime | None = None
    last_event_at: datetime | None = None
