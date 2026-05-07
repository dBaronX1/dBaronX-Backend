from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.internal_access import require_internal_access
from app.schemas.affiliate_payout_risk import (
    AffiliatePayoutRiskRequest,
    AffiliatePayoutRiskResponse,
)
from app.services.affiliate_payout_risk_service import AffiliatePayoutRiskService

router = APIRouter(
    dependencies=[Depends(require_internal_access)],
    prefix="/affiliate-payout-risk",
    tags=["affiliate-payout-risk"],
)


def affiliate_payout_risk_service_dep() -> AffiliatePayoutRiskService:
    return AffiliatePayoutRiskService()


@router.post("/evaluate", response_model=AffiliatePayoutRiskResponse)
async def evaluate_affiliate_payout_risk(
    payload: AffiliatePayoutRiskRequest,
    service: AffiliatePayoutRiskService = Depends(
        affiliate_payout_risk_service_dep
    ),
):
    result = service.evaluate(
        account_id=payload.account_id,
        payout_amount=payload.payout_amount,
        payout_method=payload.payout_method,
        ip=payload.ip,
        recent_ip_events=payload.recent_ip_events,
        distinct_accounts_24h=payload.distinct_accounts_24h,
        failed_captcha_1h=payload.failed_captcha_1h,
        affiliate_velocity=payload.affiliate_velocity,
        account_profile=payload.account_profile,
        recent_payout_requests_30d=payload.recent_payout_requests_30d,
        average_payout_amount_90d=payload.average_payout_amount_90d,
    )
    return AffiliatePayoutRiskResponse(**result)
