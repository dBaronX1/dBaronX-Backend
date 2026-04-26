from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_recommendation_signal import (
    StoryRecommendationSignalRequest,
    StoryRecommendationSignalResponse,
)
from app.services.story_recommendation_signal_service import (
    StoryRecommendationSignalService,
)

router = APIRouter(
    prefix="/story-recommendation-signals",
    tags=["story-recommendation-signals"],
)


def story_recommendation_signal_service_dep() -> StoryRecommendationSignalService:
    return StoryRecommendationSignalService()


@router.post("/run", response_model=StoryRecommendationSignalResponse)
async def generate_story_recommendation_signals(
    payload: StoryRecommendationSignalRequest,
    service: StoryRecommendationSignalService = Depends(
        story_recommendation_signal_service_dep
    ),
):
    result = service.generate(
        content=payload.content,
        prompt=payload.prompt,
        title=payload.title,
        creator_id=payload.creator_id,
        language=payload.language,
    )
    return StoryRecommendationSignalResponse(**result)
