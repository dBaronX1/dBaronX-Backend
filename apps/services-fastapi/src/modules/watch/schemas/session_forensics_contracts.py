from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SessionForensicsSignal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: UUID
    created_at: datetime
    signal_code: str
    signal_label: str
    severity: str
    risk_level: str
    score_delta: float
    evidence: dict[str, Any]


class SessionForensicsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool = True
    session_id: str
    user_id: str | None = None
    ip_address: str | None = None
    fingerprint_hash: str | None = None
    total_signals: int = Field(ge=0)
    total_penalty_score: float = 0.0
    highest_risk_level: str = "low"
    signals: list[SessionForensicsSignal]
