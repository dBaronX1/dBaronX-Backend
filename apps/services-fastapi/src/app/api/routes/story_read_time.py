from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_read_time import StoryReadTimeRequest, StoryReadTimeResponse
from app.services.story_read_time_service import StoryReadTimeService

router = APIRouter(prefix="/story-read-time", tags=["story-read-time"])


def story_read_time_service_dep() -> StoryReadTimeService:
    return StoryReadTimeService()


@router.post("/estimate", response_model=StoryReadTimeResponse)
async def estimate_story_read_time(
    payload: StoryReadTimeRequest,
    service: StoryReadTimeService = Depends(story_read_time_service_dep),
):
    result = service.estimate(
        content=payload.content,
        language=payload.language,
        words_per_minute=payload.words_per_minute,
    )
    return StoryReadTimeResponse(**result)
