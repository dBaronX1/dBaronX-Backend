from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.dependencies import get_ai_generation_service
from app.schemas.ai_generation import (
    StoryContinuationRequest,
    StoryGenerationRequest,
    StoryGenerationResult,
    StoryRewriteRequest,
)
from app.services.ai_generation_service import AIGenerationService

router = APIRouter()


@router.post("/stories/generate", response_model=StoryGenerationResult)
async def generate_story(
    payload: StoryGenerationRequest,
    service: AIGenerationService = Depends(get_ai_generation_service),
) -> StoryGenerationResult:
    result = await service.generate_story(payload)
    return StoryGenerationResult(**result)


@router.post("/stories/continue", response_model=StoryGenerationResult)
async def continue_story(
    payload: StoryContinuationRequest,
    service: AIGenerationService = Depends(get_ai_generation_service),
) -> StoryGenerationResult:
    result = await service.continue_story(payload)
    return StoryGenerationResult(**result)


@router.post("/stories/rewrite", response_model=StoryGenerationResult)
async def rewrite_story(
    payload: StoryRewriteRequest,
    service: AIGenerationService = Depends(get_ai_generation_service),
) -> StoryGenerationResult:
    result = await service.rewrite_story(payload)
    return StoryGenerationResult(**result)
