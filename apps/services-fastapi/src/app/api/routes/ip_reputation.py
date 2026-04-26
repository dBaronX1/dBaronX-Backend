from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.ip_reputation import IpReputationRequest, IpReputationResponse
from app.services.ip_reputation_service import IpReputationService

router = APIRouter(prefix="/ip-reputation", tags=["ip-reputation"])


def ip_reputation_service_dep() -> IpReputationService:
    return IpReputationService()


@router.post("/assess", response_model=IpReputationResponse)
async def assess_ip_reputation(
    payload: IpReputationRequest,
    service: IpReputationService = Depends(ip_reputation_service_dep),
):
    result = service.assess(
        ip=payload.ip,
        recent_events=payload.recent_events,
        distinct_accounts_24h=payload.distinct_accounts_24h,
        failed_captcha_1h=payload.failed_captcha_1h,
        failed_payments_24h=payload.failed_payments_24h,
        denied_watch_claims_24h=payload.denied_watch_claims_24h,
    )
    return IpReputationResponse(**result)
