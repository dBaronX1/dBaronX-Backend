from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.account_trust_profile import (
    AccountTrustProfileRequest,
    AccountTrustProfileResponse,
)
from app.services.account_trust_profile_service import AccountTrustProfileService

router = APIRouter(prefix="/account-trust-profile", tags=["account-trust-profile"])


def account_trust_profile_service_dep() -> AccountTrustProfileService:
    return AccountTrustProfileService()


@router.post("/evaluate", response_model=AccountTrustProfileResponse)
async def evaluate_account_trust_profile(
    payload: AccountTrustProfileRequest,
    service: AccountTrustProfileService = Depends(
        account_trust_profile_service_dep
    ),
):
    result = service.evaluate(
        account_id=payload.account_id,
        account_age_days=payload.account_age_days,
        email_verified=payload.email_verified,
        phone_verified=payload.phone_verified,
        completed_orders=payload.completed_orders,
        successful_watches_30d=payload.successful_watches_30d,
        denied_watches_30d=payload.denied_watches_30d,
        affiliate_payout_rejections_180d=payload.affiliate_payout_rejections_180d,
        chargebacks_365d=payload.chargebacks_365d,
        policy_flags_180d=payload.policy_flags_180d,
        device_count_30d=payload.device_count_30d,
    )
    return AccountTrustProfileResponse(**result)
