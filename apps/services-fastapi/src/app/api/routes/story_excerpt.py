from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_excerpt import StoryExcerptRequest, StoryExcerptResponse
from app.services.story_excerpt_service import StoryExcerptService

router = APIRouter(prefix="/story-excerpt", tags=["story-excerpt"])


def story_excerpt_service_dep() -> StoryExcerptService:
    return StoryExcerptService()


@router.post("/generate", response_model=StoryExcerptResponse)
async def generate_story_excerpt(
    payload: StoryExcerptRequest,
    service: StoryExcerptService = Depends(story_excerpt_service_dep),
):
    result = service.generate_excerpt(
        content=payload.content,
        title_hint=payload.title_hint,
        max_words=payload.max_words,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
    )
    return StoryExcerptResponse(**result)
