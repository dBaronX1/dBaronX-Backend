from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_continue import StoryContinueRequest, StoryContinueResponse
from app.services.story_continue_service import StoryContinueService

router = APIRouter(prefix="/story-continue", tags=["story-continue"])


def story_continue_service_dep() -> StoryContinueService:
    return StoryContinueService()


@router.post("/run", response_model=StoryContinueResponse)
async def continue_story(
    payload: StoryContinueRequest,
    service: StoryContinueService = Depends(story_continue_service_dep),
):
    result = await service.continue_story(
        content=payload.content,
        continuation_prompt=payload.continuation_prompt,
        target_words=payload.target_words,
        language=payload.language,
        maintain_style=payload.maintain_style,
    )
    return StoryContinueResponse(**result)
