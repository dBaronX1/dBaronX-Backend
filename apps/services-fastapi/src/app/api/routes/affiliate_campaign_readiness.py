from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.affiliate_campaign_readiness import (
    AffiliateCampaignReadinessResponse,
)
from app.services.affiliate_campaign_readiness_service import (
    AffiliateCampaignReadinessService,
)

router = APIRouter(
    prefix="/affiliate-campaign-readiness",
    tags=["affiliate-campaign-readiness"],
)


def affiliate_campaign_readiness_service_dep() -> AffiliateCampaignReadinessService:
    return AffiliateCampaignReadinessService()


@router.get("/snapshot", response_model=AffiliateCampaignReadinessResponse)
async def get_affiliate_campaign_readiness_snapshot(
    service: AffiliateCampaignReadinessService = Depends(
        affiliate_campaign_readiness_service_dep
    ),
):
    result = service.build()
    return AffiliateCampaignReadinessResponse(**result)
