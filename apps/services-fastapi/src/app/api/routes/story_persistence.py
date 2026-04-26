from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import story_persistence_service_dep
from app.schemas.story_persistence import (
    ModerationLogCreateRequest,
    PersistenceResponse,
    StoryCreateRequest,
    StoryGenerationJobCreateRequest,
    StoryGenerationJobStateRequest,
)
from app.services.story_persistence_service import StoryPersistenceService

router = APIRouter(prefix="/story-persistence", tags=["story-persistence"])


@router.post("/jobs", response_model=PersistenceResponse)
async def create_generation_job(
    payload: StoryGenerationJobCreateRequest,
    service: StoryPersistenceService = Depends(story_persistence_service_dep),
):
    record = await service.create_generation_job(
        user_id=payload.user_id,
        prompt=payload.prompt,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        metadata=payload.metadata,
    )
    return PersistenceResponse(success=True, record=record)


@router.post("/jobs/{job_id}/running", response_model=PersistenceResponse)
async def mark_job_running(
    job_id: str,
    payload: StoryGenerationJobStateRequest,
    service: StoryPersistenceService = Depends(story_persistence_service_dep),
):
    record = await service.mark_job_running(
        job_id=job_id,
        metadata=payload.metadata,
    )
    return PersistenceResponse(success=True, record=record)


@router.post("/jobs/{job_id}/completed", response_model=PersistenceResponse)
async def mark_job_completed(
    job_id: str,
    payload: StoryGenerationJobStateRequest,
    service: StoryPersistenceService = Depends(story_persistence_service_dep),
):
    record = await service.mark_job_completed(
        job_id=job_id,
        metadata=payload.metadata,
    )
    return PersistenceResponse(success=True, record=record)


@router.post("/jobs/{job_id}/failed", response_model=PersistenceResponse)
async def mark_job_failed(
    job_id: str,
    payload: StoryGenerationJobStateRequest,
    service: StoryPersistenceService = Depends(story_persistence_service_dep),
):
    record = await service.mark_job_failed(
        job_id=job_id,
        error_message=str(payload.metadata.get("error", "generation failed")),
        metadata=payload.metadata,
    )
    return PersistenceResponse(success=True, record=record)


@router.post("/stories", response_model=PersistenceResponse)
async def save_story_record(
    payload: StoryCreateRequest,
    service: StoryPersistenceService = Depends(story_persistence_service_dep),
):
    record = await service.save_story_record(
        user_id=payload.user_id,
        title=payload.title,
        slug=payload.slug,
        prompt=payload.prompt,
        content=payload.content,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        provider=payload.provider,
        tags=payload.tags,
        metadata=payload.metadata,
    )
    return PersistenceResponse(success=True, record=record)


@router.post("/moderation-logs", response_model=PersistenceResponse)
async def save_moderation_log(
    payload: ModerationLogCreateRequest,
    service: StoryPersistenceService = Depends(story_persistence_service_dep),
):
    record = await service.save_moderation_result(
        story_id=payload.story_id,
        user_id=payload.user_id,
        allowed=payload.allowed,
        flags=payload.flags,
        metadata=payload.metadata,
    )
    return PersistenceResponse(success=True, record=record)
