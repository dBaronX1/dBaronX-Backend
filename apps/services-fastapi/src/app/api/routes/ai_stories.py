from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.routes.ai_generation import story_generation_service_dep
from app.schemas.ai_generation import (
    StoryGenerationRequest,
    StoryGenerationResult,
    StoryRewriteRequest,
)
from app.services.story_generation_service import StoryGenerationService

router = APIRouter(prefix="/ai-stories", tags=["ai-stories"])


@router.post("/generate", response_model=StoryGenerationResult)
async def generate_story(
    payload: StoryGenerationRequest,
    generator: StoryGenerationService = Depends(story_generation_service_dep),
) -> StoryGenerationResult:
    """Compatibility alias for the older /stories/ai-stories/generate mount."""

    return await generator.generate(payload)


@router.post("/rewrite", response_model=StoryGenerationResult)
async def rewrite_story(
    payload: StoryRewriteRequest,
    service: StoryGenerationService = Depends(story_generation_service_dep),
) -> StoryGenerationResult:
    return await service.rewrite_story(payload)
