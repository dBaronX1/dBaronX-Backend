from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_campaign_brief import (
    StoryCampaignBriefRequest,
    StoryCampaignBriefResponse,
)
from app.services.story_campaign_brief_service import StoryCampaignBriefService

router = APIRouter(prefix="/story-campaign-brief", tags=["story-campaign-brief"])


def story_campaign_brief_service_dep() -> StoryCampaignBriefService:
    return StoryCampaignBriefService()


@router.post("/build", response_model=StoryCampaignBriefResponse)
async def build_story_campaign_brief(
    payload: StoryCampaignBriefRequest,
    service: StoryCampaignBriefService = Depends(
        story_campaign_brief_service_dep
    ),
):
    result = await service.build(
        title=payload.title,
        excerpt=payload.excerpt,
        content=payload.content,
        creator_profile=payload.creator_profile,
        genre=payload.genre,
        tone=payload.tone,
        audience=payload.audience,
        creator_name=payload.creator_name,
        tags=payload.tags,
        prompt=payload.prompt,
        language=payload.language,
        market_context=payload.market_context,
        comparison_contents=payload.comparison_contents,
    )
    return StoryCampaignBriefResponse(**result)
