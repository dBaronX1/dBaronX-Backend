from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class AffiliatePayoutRiskRequest(BaseModel):
    account_id: str = Field(..., min_length=1, max_length=120)
    payout_amount: float = Field(..., ge=0.0, le=1000000000.0)
    payout_method: str = Field(..., min_length=1, max_length=40)
    ip: str = Field(..., min_length=3, max_length=100)
    recent_ip_events: list[dict] | None = None
    distinct_accounts_24h: int = Field(default=0, ge=0, le=1000000)
    failed_captcha_1h: int = Field(default=0, ge=0, le=1000000)
    affiliate_velocity: dict | None = None
    account_profile: dict | None = None
    recent_payout_requests_30d: int = Field(default=0, ge=0, le=1000000)
    average_payout_amount_90d: float | None = Field(default=None, ge=0.0, le=1000000000.0)

    @field_validator("account_id", "payout_method", "ip")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned


class AffiliatePayoutRiskResponse(BaseModel):
    success: bool
    affiliate_payout_risk: dict
