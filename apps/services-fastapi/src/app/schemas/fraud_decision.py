from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class FraudDecisionRequest(BaseModel):
    flow_type: str = Field(..., min_length=1, max_length=40)
    account_id: str = Field(..., min_length=1, max_length=120)
    ip: str = Field(..., min_length=3, max_length=100)
    headers: dict = Field(...)
    session_payload: dict | None = None
    affiliate_payload: dict | None = None
    payment_payload: dict | None = None
    account_profile: dict | None = None

    @field_validator("flow_type", "account_id", "ip")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned


class FraudDecisionResponse(BaseModel):
    success: bool
    fraud_decision: dict
