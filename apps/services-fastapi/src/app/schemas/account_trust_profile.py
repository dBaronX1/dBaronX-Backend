from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class AccountTrustProfileRequest(BaseModel):
    account_id: str = Field(..., min_length=1, max_length=120)
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

    @field_validator("account_id")
    @classmethod
    def normalize_account_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("account_id is required")
        return cleaned


class AccountTrustProfileResponse(BaseModel):
    success: bool
    account_trust: dict
