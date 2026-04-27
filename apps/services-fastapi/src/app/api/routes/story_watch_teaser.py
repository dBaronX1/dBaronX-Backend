from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_watch_teaser import (
    StoryWatchTeaserRequest,
    StoryWatchTeaserResponse,
)
from app.services.story_watch_teaser_service import StoryWatchTeaserService

router = APIRouter(prefix="/story-watch-teaser", tags=["story-watch-teaser"])


def story_watch_teaser_service_dep() -> StoryWatchTeaserService:
    return StoryWatchTeaserService()


@router.post("/build", response_model=StoryWatchTeaserResponse)
async def build_story_watch_teaser(
    payload: StoryWatchTeaserRequest,
    service: StoryWatchTeaserService = Depends(
        story_watch_teaser_service_dep
    ),
):
    result = service.build(
        title=payload.title,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        teaser_seconds=payload.teaser_seconds,
    )
    return StoryWatchTeaserResponse(**result)
