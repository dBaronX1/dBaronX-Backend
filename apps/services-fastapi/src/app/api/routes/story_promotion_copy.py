from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import (
    story_ad_copy_service_dep,
    story_affiliate_copy_service_dep,
)
from app.schemas.story_promotion_copy import (
    StoryPromotionCopyRequest,
    StoryPromotionCopyResponse,
)
from app.services.story_ad_copy_service import StoryAdCopyService
from app.services.story_affiliate_copy_service import StoryAffiliateCopyService

router = APIRouter(prefix="/story-promotion-copy", tags=["story-promotion-copy"])


@router.post("", response_model=StoryPromotionCopyResponse)
async def build_story_promotion_copy(
    payload: StoryPromotionCopyRequest,
    ad_copy_service: StoryAdCopyService = Depends(story_ad_copy_service_dep),
    affiliate_copy_service: StoryAffiliateCopyService = Depends(story_affiliate_copy_service_dep),
):
    ad = ad_copy_service.generate(
        title=payload.title,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        tags=payload.tags,
    )
    affiliate = affiliate_copy_service.generate(
        title=payload.title,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        tags=payload.tags,
    )
    return StoryPromotionCopyResponse(
        success=True,
        ad=ad,
        affiliate=affiliate,
    )
