from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_market_position import (
    StoryMarketPositionRequest,
    StoryMarketPositionResponse,
)
from app.services.story_market_position_service import StoryMarketPositionService

router = APIRouter(prefix="/story-market-position", tags=["story-market-position"])


def story_market_position_service_dep() -> StoryMarketPositionService:
    return StoryMarketPositionService()


@router.post("/evaluate", response_model=StoryMarketPositionResponse)
async def evaluate_story_market_position(
    payload: StoryMarketPositionRequest,
    service: StoryMarketPositionService = Depends(story_market_position_service_dep),
):
    result = await service.evaluate(
        title=payload.title,
        content=payload.content,
        creator_profile=payload.creator_profile,
        prompt=payload.prompt,
        language=payload.language,
        tags=payload.tags,
        market_context=payload.market_context,
        comparison_contents=payload.comparison_contents,
    )
    return StoryMarketPositionResponse(**result)
