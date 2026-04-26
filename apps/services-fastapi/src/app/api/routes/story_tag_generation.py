from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_tag_generation import (
    StoryTagGenerationRequest,
    StoryTagGenerationResponse,
)
from app.services.story_tag_generation_service import StoryTagGenerationService

router = APIRouter(prefix="/story-tags", tags=["story-tags"])


def story_tag_generation_service_dep() -> StoryTagGenerationService:
    return StoryTagGenerationService()


@router.post("/generate", response_model=StoryTagGenerationResponse)
async def generate_story_tags(
    payload: StoryTagGenerationRequest,
    service: StoryTagGenerationService = Depends(
        story_tag_generation_service_dep
    ),
):
    result = service.generate_tags(
        content=payload.content,
        prompt=payload.prompt,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        title_hint=payload.title_hint,
    )
    return StoryTagGenerationResponse(**result)
