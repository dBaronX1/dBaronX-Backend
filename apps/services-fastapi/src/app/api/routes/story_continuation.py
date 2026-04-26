from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_continuation import (
    StoryContinuationRequest,
    StoryContinuationResponse,
)
from app.services.story_continuation_service import StoryContinuationService

router = APIRouter(prefix="/story-continuation", tags=["story-continuation"])


def story_continuation_service_dep() -> StoryContinuationService:
    return StoryContinuationService()


@router.post("/continue", response_model=StoryContinuationResponse)
async def continue_story(
    payload: StoryContinuationRequest,
    service: StoryContinuationService = Depends(story_continuation_service_dep),
):
    result = await service.continue_story(
        existing_content=payload.existing_content,
        continuation_instruction=payload.continuation_instruction,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        target_word_count=payload.target_word_count,
    )
    return StoryContinuationResponse(**result)
