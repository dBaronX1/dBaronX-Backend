from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import story_generation_service_dep
from app.schemas.ai_generation import (
    StoryContinuationRequest,
    StoryGenerationRequest,
    StoryGenerationResult,
    StoryRewriteRequest,
)
from app.services.story_generation_service import StoryGenerationService

router = APIRouter(prefix="/ai", tags=["ai-generation"])


@router.post(
    "/stories/generate",
    response_model=StoryGenerationResult,
    summary="Generate a new AI story with moderation and provider fallback",
)
async def generate_story(
    payload: StoryGenerationRequest,
    service: StoryGenerationService = Depends(story_generation_service_dep),
) -> StoryGenerationResult:
    return await service.generate(payload)


@router.post(
    "/stories/continue",
    response_model=StoryGenerationResult,
    summary="Continue an existing story under the same canonical AI contract",
)
async def continue_story(
    payload: StoryContinuationRequest,
    service: StoryGenerationService = Depends(story_generation_service_dep),
) -> StoryGenerationResult:
    return await service.continue_story(payload)


@router.post(
    "/stories/rewrite",
    response_model=StoryGenerationResult,
    summary="Rewrite or refine a story with moderation and persistence",
)
async def rewrite_story(
    payload: StoryRewriteRequest,
    service: StoryGenerationService = Depends(story_generation_service_dep),
) -> StoryGenerationResult:
    return await service.rewrite_story(payload)
