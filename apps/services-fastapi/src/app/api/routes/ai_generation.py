from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends

from app.services.ai_provider_service import AIProviderService
from app.services.idempotency_service import IdempotencyService
from app.services.moderation_service import ModerationService
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService
from app.schemas.ai_generation import (
    StoryContinuationRequest,
    StoryGenerationRequest,
    StoryGenerationResult,
    StoryRewriteRequest,
)
from app.services.story_generation_service import StoryGenerationService

router = APIRouter(prefix="/ai", tags=["ai-generation"])


@lru_cache(maxsize=1)
def get_ai_provider_service() -> AIProviderService:
    return AIProviderService()


@lru_cache(maxsize=1)
def get_supabase_service() -> SupabaseService:
    return SupabaseService()


@lru_cache(maxsize=1)
def get_story_generation_service() -> StoryGenerationService:
    return StoryGenerationService(
        provider_service=get_ai_provider_service(),
        moderation_service=ModerationService(),
        idempotency_service=IdempotencyService(redis=RedisService()),
        supabase=get_supabase_service(),
    )


def story_generation_service_dep() -> StoryGenerationService:
    return get_story_generation_service()


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
    "/generate",
    response_model=StoryGenerationResult,
    summary="Legacy-compatible alias for /ai/stories/generate",
)
async def legacy_generate_story(
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
    "/continue",
    response_model=StoryGenerationResult,
    summary="Legacy-compatible alias for /ai/stories/continue",
)
async def legacy_continue_story(
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


@router.post(
    "/rewrite",
    response_model=StoryGenerationResult,
    summary="Legacy-compatible alias for /ai/stories/rewrite",
)
async def legacy_rewrite_story(
    payload: StoryRewriteRequest,
    service: StoryGenerationService = Depends(story_generation_service_dep),
) -> StoryGenerationResult:
    return await service.rewrite_story(payload)


@router.get(
    "/stories/readiness",
    summary="AI Stories provider and route readiness",
)
async def ai_stories_readiness() -> dict:
    provider_service = get_ai_provider_service()
    provider_flags = provider_service.configured_provider_flags()
    provider_configured = any(provider_flags.values())
    blockers: list[str] = []

    if not provider_configured:
        blockers.append("ai_provider_missing")

    return {
        "success": True,
        "providerConfigured": provider_configured,
        "generationEndpointReady": True,
        "providersDetected": provider_flags,
        "providerOrder": provider_service.provider_order(),
        "blockers": blockers,
    }
