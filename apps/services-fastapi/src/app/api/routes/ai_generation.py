from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import story_generation_service_dep
from app.services.service_registry import get_ai_provider_service, get_supabase_service
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
    summary="AI Stories provider and persistence readiness",
)
async def ai_stories_readiness() -> dict:
    provider_service = get_ai_provider_service()
    supabase = get_supabase_service()
    provider_flags = provider_service.configured_provider_flags()
    provider_configured = any(provider_flags.values())
    persistence_ready = await supabase.ai_stories_ready()
    blockers: list[str] = []
    if not provider_configured:
        blockers.append("No Gemini, OpenAI, or Anthropic provider key is configured.")
    if not persistence_ready:
        blockers.append("app_public.ai_stories is not reachable with the configured Supabase service role.")
    return {
        "fastapiReachable": True,
        "providerConfigured": provider_configured,
        "providerConfiguredBooleans": provider_flags,
        "generationEndpointReady": provider_configured,
        "persistenceReady": persistence_ready,
        "supabaseReady": persistence_ready,
        "fallbackOrder": ["gemini", "openai", "anthropic"],
        "blockers": blockers,
    }
