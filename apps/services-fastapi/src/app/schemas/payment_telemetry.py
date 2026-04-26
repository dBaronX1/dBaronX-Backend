from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class PaymentTelemetryRequest(BaseModel):
    order_id: str = Field(..., min_length=1, max_length=120)
    account_id: str | None = Field(default=None, max_length=120)
    ip: str = Field(..., min_length=3, max_length=100)
    headers: dict = Field(...)
    amount: float = Field(..., ge=0.0, le=1000000000.0)
    currency: str = Field(..., min_length=3, max_length=10)
    failed_payments_24h: int = Field(default=0, ge=0, le=1000000)
    attempts_last_1h: int = Field(default=0, ge=0, le=1000000)
    distinct_cards_last_24h: int = Field(default=0, ge=0, le=1000000)
    distinct_accounts_from_ip_24h: int = Field(default=0, ge=0, le=1000000)
    recent_ip_events: list[dict] | None = None

    @field_validator("order_id", "account_id", "ip", "currency")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if cleaned == "":
            return None
        return cleaned


class PaymentTelemetryResponse(BaseModel):
    success: bool
    payment_telemetry: dict
