from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_rewrite import StoryRewriteRequest, StoryRewriteResponse
from app.services.story_rewrite_service import StoryRewriteService

router = APIRouter(prefix="/story-rewrite", tags=["story-rewrite"])


def story_rewrite_service_dep() -> StoryRewriteService:
    return StoryRewriteService()


@router.post("/run", response_model=StoryRewriteResponse)
async def rewrite_story(
    payload: StoryRewriteRequest,
    service: StoryRewriteService = Depends(story_rewrite_service_dep),
):
    result = await service.rewrite(
        content=payload.content,
        instruction=payload.instruction,
        preserve_plot=payload.preserve_plot,
        preserve_length=payload.preserve_length,
        target_tone=payload.target_tone,
        target_audience=payload.target_audience,
        language=payload.language,
    )
    return StoryRewriteResponse(**result)
