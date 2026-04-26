from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import (
    story_generation_service_dep,
    story_repository_dep,
    story_rewrite_service_dep,
)
from app.schemas.story_generation import (
    StoryGenerationRequest,
    StoryGenerationResponse,
    StoryRewriteRequest,
    StoryRewriteResponse,
)
from app.services.story_generation_service import StoryGenerationService
from app.services.story_repository import StoryRepository
from app.services.story_rewrite_service import StoryRewriteService

router = APIRouter(prefix="/ai-stories", tags=["ai-stories"])


@router.post("/generate", response_model=StoryGenerationResponse)
async def generate_story(
    payload: StoryGenerationRequest,
    generator: StoryGenerationService = Depends(story_generation_service_dep),
    repository: StoryRepository = Depends(story_repository_dep),
):
    job = await repository.create_generation_job(
        user_id=payload.user_id,
        prompt=payload.prompt,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        status="running",
        metadata={"source": "fastapi.generate_story"},
    )

    try:
        result = await generator.generate(payload)

        story = await repository.save_story(
            user_id=payload.user_id,
            title=result.title,
            slug=result.slug,
            prompt=payload.prompt,
            content=result.content,
            excerpt=result.excerpt,
            genre=result.genre,
            tone=result.tone,
            language=result.language,
            provider=result.provider,
            tags=result.tags,
            metadata=result.metadata,
        )

        await repository.save_moderation_log(
            story_id=str(story.get("id")),
            user_id=payload.user_id,
            allowed=bool(result.moderation.get("allowed")),
            flags=list(result.moderation.get("flags") or []),
            metadata={"provider": result.provider},
        )

        await repository.mark_generation_job(
            job_id=str(job.get("id")),
            status="completed",
            metadata={"story_id": story.get("id")},
        )

        return result
    except Exception as exc:  # noqa: BLE001
        await repository.mark_generation_job(
            job_id=str(job.get("id")),
            status="failed",
            metadata={"error": str(exc)},
        )
        raise


@router.post("/rewrite", response_model=StoryRewriteResponse)
async def rewrite_story(
    payload: StoryRewriteRequest,
    service: StoryRewriteService = Depends(story_rewrite_service_dep),
):
    return await service.rewrite(payload)
