from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_ad_copy import StoryAdCopyRequest, StoryAdCopyResponse
from app.services.story_ad_copy_service import StoryAdCopyService

router = APIRouter(prefix="/story-ad-copy", tags=["story-ad-copy"])


def story_ad_copy_service_dep() -> StoryAdCopyService:
    return StoryAdCopyService()


@router.post("/build", response_model=StoryAdCopyResponse)
async def build_story_ad_copy(
    payload: StoryAdCopyRequest,
    service: StoryAdCopyService = Depends(story_ad_copy_service_dep),
):
    result = service.build(
        title=payload.title,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        audience=payload.audience,
        campaign_goal=payload.campaign_goal,
    )
    return StoryAdCopyResponse(**result)
