from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_recommendation_signals import (
    StoryRecommendationSignalsRequest,
    StoryRecommendationSignalsResponse,
)
from app.services.recommendation_signal_service import RecommendationSignalService

router = APIRouter(
    prefix="/story-recommendation-signals",
    tags=["story-recommendation-signals"],
)


def recommendation_signal_service_dep() -> RecommendationSignalService:
    return RecommendationSignalService()


@router.post("/build", response_model=StoryRecommendationSignalsResponse)
async def build_story_recommendation_signals(
    payload: StoryRecommendationSignalsRequest,
    service: RecommendationSignalService = Depends(recommendation_signal_service_dep),
):
    signals = service.from_story(
        title=payload.title,
        excerpt=payload.excerpt,
        content=payload.content,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        tags=payload.tags,
    )
    return StoryRecommendationSignalsResponse(success=True, signals=signals)
