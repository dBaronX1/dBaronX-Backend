from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_promotion_eligibility import (
    StoryPromotionEligibilityRequest,
    StoryPromotionEligibilityResponse,
)
from app.services.story_promotion_eligibility_service import (
    StoryPromotionEligibilityService,
)

router = APIRouter(
    prefix="/story-promotion-eligibility",
    tags=["story-promotion-eligibility"],
)


def story_promotion_eligibility_service_dep() -> StoryPromotionEligibilityService:
    return StoryPromotionEligibilityService()


@router.post("/evaluate", response_model=StoryPromotionEligibilityResponse)
async def evaluate_story_promotion_eligibility(
    payload: StoryPromotionEligibilityRequest,
    service: StoryPromotionEligibilityService = Depends(
        story_promotion_eligibility_service_dep
    ),
):
    result = await service.evaluate(
        title=payload.title,
        content=payload.content,
        creator_profile=payload.creator_profile,
        prompt=payload.prompt,
        language=payload.language,
        tags=payload.tags,
        target_channel=payload.target_channel,
        comparison_contents=payload.comparison_contents,
        market_context=payload.market_context,
    )
    return StoryPromotionEligibilityResponse(**result)
