from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class IpReputationRequest(BaseModel):
    ip: str = Field(..., min_length=3, max_length=100)
    recent_events: list[dict] | None = None
    distinct_accounts_24h: int = Field(default=0, ge=0, le=100000)
    failed_captcha_1h: int = Field(default=0, ge=0, le=100000)
    failed_payments_24h: int = Field(default=0, ge=0, le=100000)
    denied_watch_claims_24h: int = Field(default=0, ge=0, le=100000)

    @field_validator("ip")
    @classmethod
    def normalize_ip(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("ip is required")
        return cleaned


class IpReputationResponse(BaseModel):
    success: bool
    ip_reputation: dict
