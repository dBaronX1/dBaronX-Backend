from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_generation_job import (
    StoryGenerationJobRequest,
    StoryGenerationJobResponse,
)
from app.services.story_generation_job_service import StoryGenerationJobService

router = APIRouter(prefix="/story-generation-jobs", tags=["story-generation-jobs"])


def story_generation_job_service_dep() -> StoryGenerationJobService:
    return StoryGenerationJobService()


@router.post("/run", response_model=StoryGenerationJobResponse)
async def run_story_generation_job(
    payload: StoryGenerationJobRequest,
    service: StoryGenerationJobService = Depends(story_generation_job_service_dep),
):
    result = await service.run_job(
        prompt=payload.prompt,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        target_words=payload.target_words,
        title_hint=payload.title_hint,
        audience=payload.audience,
        request_id=payload.request_id,
        user_id=payload.user_id,
    )
    return StoryGenerationJobResponse(**result)
