from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_quality import StoryQualityRequest, StoryQualityResponse
from app.services.story_quality_service import StoryQualityService

router = APIRouter(prefix="/story-quality", tags=["story-quality"])


def story_quality_service_dep() -> StoryQualityService:
    return StoryQualityService()


@router.post("/evaluate", response_model=StoryQualityResponse)
async def evaluate_story_quality(
    payload: StoryQualityRequest,
    service: StoryQualityService = Depends(story_quality_service_dep),
):
    quality = service.evaluate(
        title=payload.title,
        content=payload.content,
        excerpt=payload.excerpt,
        tags=payload.tags,
    )
    return StoryQualityResponse(
        success=True,
        quality=quality,
    )
