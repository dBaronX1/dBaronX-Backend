from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.w2e_campaign_readiness import (
    W2ECampaignReadinessResponse,
)
from app.services.w2e_campaign_readiness_service import (
    W2ECampaignReadinessService,
)

router = APIRouter(
    prefix="/w2e-campaign-readiness",
    tags=["w2e-campaign-readiness"],
)


def w2e_campaign_readiness_service_dep() -> W2ECampaignReadinessService:
    return W2ECampaignReadinessService()


@router.get("/snapshot", response_model=W2ECampaignReadinessResponse)
async def get_w2e_campaign_readiness_snapshot(
    service: W2ECampaignReadinessService = Depends(
        w2e_campaign_readiness_service_dep
    ),
):
    result = service.build()
    return W2ECampaignReadinessResponse(**result)
