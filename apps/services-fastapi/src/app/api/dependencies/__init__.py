from __future__ import annotations

from app.api.dependencies.ai_dependencies import (
    llm_orchestrator_service_dep,
    story_generation_service_dep,
    story_repository_dep,
    story_rewrite_service_dep,
)
from app.services.content_moderation_service import ContentModerationService
from app.services.prompt_policy_service import PromptPolicyService
from app.services.recommendation_signal_service import RecommendationSignalService
from app.services.story_ad_copy_service import StoryAdCopyService
from app.services.story_affiliate_copy_service import StoryAffiliateCopyService
from app.services.story_classification_service import StoryClassificationService
from app.services.story_duplicate_detection_service import StoryDuplicateDetectionService
from app.services.story_enrichment_service import StoryEnrichmentService
from app.services.story_metadata_service import StoryMetadataService
from app.services.story_persistence_service import StoryPersistenceService
from app.services.story_prompt_enhancement_service import StoryPromptEnhancementService


def prompt_policy_service_dep() -> PromptPolicyService:
    return PromptPolicyService()


def content_moderation_service_dep() -> ContentModerationService:
    return ContentModerationService()


def recommendation_signal_service_dep() -> RecommendationSignalService:
    return RecommendationSignalService()


def story_metadata_service_dep() -> StoryMetadataService:
    return StoryMetadataService()


def story_persistence_service_dep() -> StoryPersistenceService:
    return StoryPersistenceService(repository=story_repository_dep())


def story_classification_service_dep() -> StoryClassificationService:
    return StoryClassificationService(
        moderation_service=content_moderation_service_dep(),
        metadata_service=story_metadata_service_dep(),
        recommendation_signal_service=recommendation_signal_service_dep(),
    )


def story_duplicate_detection_service_dep() -> StoryDuplicateDetectionService:
    return StoryDuplicateDetectionService()


def story_prompt_enhancement_service_dep() -> StoryPromptEnhancementService:
    return StoryPromptEnhancementService(
        prompt_policy_service=prompt_policy_service_dep(),
    )


def story_enrichment_service_dep() -> StoryEnrichmentService:
    return StoryEnrichmentService(
        metadata_service=story_metadata_service_dep(),
        moderation_service=content_moderation_service_dep(),
        recommendation_signal_service=recommendation_signal_service_dep(),
        duplicate_detection_service=story_duplicate_detection_service_dep(),
        ad_copy_service=story_ad_copy_service_dep(),
        affiliate_copy_service=story_affiliate_copy_service_dep(),
    )


def story_ad_copy_service_dep() -> StoryAdCopyService:
    return StoryAdCopyService()


def story_affiliate_copy_service_dep() -> StoryAffiliateCopyService:
    return StoryAffiliateCopyService()


__all__ = [
    "llm_orchestrator_service_dep",
    "story_generation_service_dep",
    "story_repository_dep",
    "story_rewrite_service_dep",
    "prompt_policy_service_dep",
    "content_moderation_service_dep",
    "recommendation_signal_service_dep",
    "story_metadata_service_dep",
    "story_persistence_service_dep",
    "story_classification_service_dep",
    "story_duplicate_detection_service_dep",
    "story_prompt_enhancement_service_dep",
    "story_enrichment_service_dep",
    "story_ad_copy_service_dep",
    "story_affiliate_copy_service_dep",
]
