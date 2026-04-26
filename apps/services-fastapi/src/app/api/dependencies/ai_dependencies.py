from __future__ import annotations

from app.core.settings import get_settings
from app.services.anthropic_provider import AnthropicProvider
from app.services.content_moderation_service import ContentModerationService
from app.services.gemini_provider import GeminiProvider
from app.services.llm_orchestrator_service import LLMOrchestratorService
from app.services.openai_provider import OpenAIProvider
from app.services.prompt_policy_service import PromptPolicyService
from app.services.recommendation_signal_service import RecommendationSignalService
from app.services.story_generation_service import StoryGenerationService
from app.services.story_metadata_service import StoryMetadataService
from app.services.story_repository import StoryRepository
from app.services.story_rewrite_service import StoryRewriteService
from app.services.supabase_service import SupabaseService


def llm_orchestrator_service_dep() -> LLMOrchestratorService:
    settings = get_settings()

    anthropic_provider = (
        AnthropicProvider(api_key=settings.anthropic_api_key)
        if settings.anthropic_api_key
        else None
    )
    openai_provider = (
        OpenAIProvider(api_key=settings.openai_api_key)
        if settings.openai_api_key
        else None
    )
    gemini_provider = (
        GeminiProvider(api_key=settings.gemini_api_key)
        if settings.gemini_api_key
        else None
    )

    return LLMOrchestratorService(
        anthropic_provider=anthropic_provider,
        openai_provider=openai_provider,
        gemini_provider=gemini_provider,
    )


def story_repository_dep() -> StoryRepository:
    return StoryRepository(supabase=SupabaseService())


def story_generation_service_dep() -> StoryGenerationService:
    return StoryGenerationService(
        prompt_policy_service=PromptPolicyService(),
        llm_orchestrator_service=llm_orchestrator_service_dep(),
        story_metadata_service=StoryMetadataService(),
        content_moderation_service=ContentModerationService(),
        recommendation_signal_service=RecommendationSignalService(),
    )


def story_rewrite_service_dep() -> StoryRewriteService:
    return StoryRewriteService(
        prompt_policy_service=PromptPolicyService(),
        llm_orchestrator_service=llm_orchestrator_service_dep(),
        content_moderation_service=ContentModerationService(),
        story_metadata_service=StoryMetadataService(),
    )
