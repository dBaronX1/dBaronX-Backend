from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_generation import StoryGenerationRequest, StoryGenerationResponse
from app.services.story_generation_orchestrator_service import (
    StoryGenerationOrchestratorService,
)

router = APIRouter(prefix="/story-generation", tags=["story-generation"])


def story_generation_orchestrator_dep() -> StoryGenerationOrchestratorService:
    return StoryGenerationOrchestratorService()


@router.post("/generate", response_model=StoryGenerationResponse)
async def generate_story(
    payload: StoryGenerationRequest,
    orchestrator: StoryGenerationOrchestratorService = Depends(
        story_generation_orchestrator_dep
    ),
):
    result = await orchestrator.generate(
        user_id=payload.user_id,
        prompt=payload.prompt,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        title_hint=payload.title_hint,
        target_word_count=payload.target_word_count,
        metadata=payload.metadata,
    )
    return StoryGenerationResponse(**result)
