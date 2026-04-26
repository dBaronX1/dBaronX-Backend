from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_promotion_readiness import (
    StoryPromotionReadinessResponse,
)
from app.services.story_promotion_readiness_service import (
    StoryPromotionReadinessService,
)

router = APIRouter(
    prefix="/story-promotion-readiness",
    tags=["story-promotion-readiness"],
)


def story_promotion_readiness_service_dep() -> StoryPromotionReadinessService:
    return StoryPromotionReadinessService()


@router.get("/snapshot", response_model=StoryPromotionReadinessResponse)
async def get_story_promotion_readiness_snapshot(
    service: StoryPromotionReadinessService = Depends(
        story_promotion_readiness_service_dep
    ),
):
    result = service.build()
    return StoryPromotionReadinessResponse(**result)
