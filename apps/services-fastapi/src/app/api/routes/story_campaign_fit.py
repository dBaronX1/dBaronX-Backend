from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_campaign_fit import (
    StoryCampaignFitRequest,
    StoryCampaignFitResponse,
)
from app.services.story_campaign_fit_service import StoryCampaignFitService

router = APIRouter(prefix="/story-campaign-fit", tags=["story-campaign-fit"])


def story_campaign_fit_service_dep() -> StoryCampaignFitService:
    return StoryCampaignFitService()


@router.post("/evaluate", response_model=StoryCampaignFitResponse)
async def evaluate_story_campaign_fit(
    payload: StoryCampaignFitRequest,
    service: StoryCampaignFitService = Depends(story_campaign_fit_service_dep),
):
    result = await service.evaluate(
        title=payload.title,
        content=payload.content,
        prompt=payload.prompt,
        language=payload.language,
        tags=payload.tags,
        creator_profile=payload.creator_profile,
        market_context=payload.market_context,
        comparison_contents=payload.comparison_contents,
    )
    return StoryCampaignFitResponse(**result)
