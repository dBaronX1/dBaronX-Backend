from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_moderation import (
    StoryModerationRequest,
    StoryModerationResponse,
)
from app.services.story_moderation_service import StoryModerationService

router = APIRouter(prefix="/story-moderation", tags=["story-moderation"])


def story_moderation_service_dep() -> StoryModerationService:
    return StoryModerationService()


@router.post("/moderate", response_model=StoryModerationResponse)
async def moderate_story(
    payload: StoryModerationRequest,
    service: StoryModerationService = Depends(story_moderation_service_dep),
):
    result = service.moderate(
        content=payload.content,
        title=payload.title,
        prompt=payload.prompt,
    )
    return StoryModerationResponse(**result)
