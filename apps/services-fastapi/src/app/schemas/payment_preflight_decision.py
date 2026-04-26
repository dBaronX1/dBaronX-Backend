from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class PaymentPreflightDecisionRequest(BaseModel):
    order_id: str = Field(..., min_length=1, max_length=120)
    account_id: str = Field(..., min_length=1, max_length=120)
    ip: str = Field(..., min_length=3, max_length=100)
    headers: dict = Field(...)
    amount: float = Field(..., ge=0.0, le=1000000000.0)
    currency: str = Field(..., min_length=3, max_length=10)
    failed_payments_24h: int = Field(default=0, ge=0, le=1000000)
    attempts_last_1h: int = Field(default=0, ge=0, le=1000000)
    distinct_cards_last_24h: int = Field(default=0, ge=0, le=1000000)
    distinct_accounts_from_ip_24h: int = Field(default=0, ge=0, le=1000000)
    recent_ip_events: list[dict] | None = None
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

    @field_validator("order_id", "account_id", "ip", "currency")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned


class PaymentPreflightDecisionResponse(BaseModel):
    success: bool
    payment_preflight: dict
