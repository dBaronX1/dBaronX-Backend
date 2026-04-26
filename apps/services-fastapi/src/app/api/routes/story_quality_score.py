from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_quality_score import (
    StoryQualityScoreRequest,
    StoryQualityScoreResponse,
)
from app.services.story_quality_score_service import StoryQualityScoreService

router = APIRouter(prefix="/story-quality-score", tags=["story-quality-score"])


def story_quality_score_service_dep() -> StoryQualityScoreService:
    return StoryQualityScoreService()


@router.post("/run", response_model=StoryQualityScoreResponse)
async def run_story_quality_score(
    payload: StoryQualityScoreRequest,
    service: StoryQualityScoreService = Depends(story_quality_score_service_dep),
):
    result = service.score(
        title=payload.title,
        content=payload.content,
        prompt=payload.prompt,
        comparison_contents=payload.comparison_contents,
        language=payload.language,
    )
    return StoryQualityScoreResponse(**result)
