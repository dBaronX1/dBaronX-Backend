from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.affiliate_velocity import (
    AffiliateVelocityRequest,
    AffiliateVelocityResponse,
)
from app.services.affiliate_velocity_service import AffiliateVelocityService

router = APIRouter(prefix="/affiliate-velocity", tags=["affiliate-velocity"])


def affiliate_velocity_service_dep() -> AffiliateVelocityService:
    return AffiliateVelocityService()


@router.post("/evaluate", response_model=AffiliateVelocityResponse)
async def evaluate_affiliate_velocity(
    payload: AffiliateVelocityRequest,
    service: AffiliateVelocityService = Depends(
        affiliate_velocity_service_dep
    ),
):
    result = service.evaluate(
        affiliate_user_id=payload.affiliate_user_id,
        clicks_last_10m=payload.clicks_last_10m,
        clicks_last_1h=payload.clicks_last_1h,
        distinct_ips_last_1h=payload.distinct_ips_last_1h,
        signups_last_24h=payload.signups_last_24h,
        qualified_watches_last_24h=payload.qualified_watches_last_24h,
        payouts_requested_last_7d=payload.payouts_requested_last_7d,
        duplicate_device_clusters_last_24h=payload.duplicate_device_clusters_last_24h,
        conversion_rate_24h=payload.conversion_rate_24h,
    )
    return AffiliateVelocityResponse(**result)
