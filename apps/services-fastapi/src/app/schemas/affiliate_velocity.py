from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class AffiliateVelocityRequest(BaseModel):
    affiliate_user_id: str = Field(..., min_length=1, max_length=120)
    clicks_last_10m: int = Field(default=0, ge=0, le=1000000)
    clicks_last_1h: int = Field(default=0, ge=0, le=1000000)
    distinct_ips_last_1h: int = Field(default=0, ge=0, le=1000000)
    signups_last_24h: int = Field(default=0, ge=0, le=1000000)
    qualified_watches_last_24h: int = Field(default=0, ge=0, le=1000000)
    payouts_requested_last_7d: int = Field(default=0, ge=0, le=1000000)
    duplicate_device_clusters_last_24h: int = Field(default=0, ge=0, le=1000000)
    conversion_rate_24h: float | None = Field(default=None, ge=0.0, le=1.0)

    @field_validator("affiliate_user_id")
    @classmethod
    def normalize_affiliate_user_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("affiliate_user_id is required")
        return cleaned


class AffiliateVelocityResponse(BaseModel):
    success: bool
    affiliate_velocity: dict
