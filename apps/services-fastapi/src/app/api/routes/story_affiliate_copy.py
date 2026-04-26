from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_affiliate_copy import (
    StoryAffiliateCopyRequest,
    StoryAffiliateCopyResponse,
)
from app.services.story_affiliate_copy_service import StoryAffiliateCopyService

router = APIRouter(prefix="/story-affiliate-copy", tags=["story-affiliate-copy"])


def story_affiliate_copy_service_dep() -> StoryAffiliateCopyService:
    return StoryAffiliateCopyService()


@router.post("/build", response_model=StoryAffiliateCopyResponse)
async def build_story_affiliate_copy(
    payload: StoryAffiliateCopyRequest,
    service: StoryAffiliateCopyService = Depends(
        story_affiliate_copy_service_dep
    ),
):
    result = service.build(
        title=payload.title,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        creator_name=payload.creator_name,
        audience=payload.audience,
    )
    return StoryAffiliateCopyResponse(**result)
