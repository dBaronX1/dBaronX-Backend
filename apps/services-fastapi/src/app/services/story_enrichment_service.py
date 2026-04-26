from __future__ import annotations

from typing import Any

from app.services.content_moderation_service import ContentModerationService
from app.services.recommendation_signal_service import RecommendationSignalService
from app.services.story_ad_copy_service import StoryAdCopyService
from app.services.story_affiliate_copy_service import StoryAffiliateCopyService
from app.services.story_duplicate_detection_service import StoryDuplicateDetectionService
from app.services.story_metadata_service import StoryMetadataService


class StoryEnrichmentService:
    """
    Single-pass story enrichment for downstream consumers.

    Used by:
    - AI story editor UX
    - NestJS campaign linking
    - ad creative bootstrapping
    - affiliate teaser generation
    - discovery signal generation
    """

    def __init__(
        self,
        *,
        metadata_service: StoryMetadataService,
        moderation_service: ContentModerationService,
        recommendation_signal_service: RecommendationSignalService,
        duplicate_detection_service: StoryDuplicateDetectionService,
        ad_copy_service: StoryAdCopyService,
        affiliate_copy_service: StoryAffiliateCopyService,
    ) -> None:
        self.metadata = metadata_service
        self.moderation = moderation_service
        self.recommendation_signals = recommendation_signal_service
        self.duplicates = duplicate_detection_service
        self.ad_copy = ad_copy_service
        self.affiliate_copy = affiliate_copy_service

    def enrich(
        self,
        *,
        title: str,
        content: str,
        genre: str,
        tone: str,
        language: str,
        existing_texts: list[str] | None = None,
    ) -> dict[str, Any]:
        effective_title = title.strip() or self.metadata.generate_title(
            prompt=content[:120],
            genre=genre,
            language=language,
        )

        excerpt = self.metadata.generate_excerpt(content, length=220)
        tags = self.metadata.generate_tags(
            content=content,
            genre=genre,
            tone=tone,
            language=language,
        )
        slug = self.metadata.slugify(effective_title)

        moderation = self.moderation.assess_text(content)
        signals = self.recommendation_signals.from_story(
            title=effective_title,
            excerpt=excerpt,
            content=content,
            genre=genre,
            tone=tone,
            language=language,
            tags=tags,
        )

        duplicate_analysis = self.duplicates.compare_against_many(
            candidate=content,
            existing_texts=existing_texts or [],
        )

        ad_copy = self.ad_copy.generate(
            title=effective_title,
            excerpt=excerpt,
            genre=genre,
            tone=tone,
            tags=tags,
        )
        affiliate_copy = self.affiliate_copy.generate(
            title=effective_title,
            excerpt=excerpt,
            genre=genre,
            tone=tone,
            tags=tags,
        )

        return {
            "excerpt": excerpt,
            "tags": tags,
            "slug": slug,
            "moderation": moderation,
            "signals": signals,
            "duplicate_analysis": duplicate_analysis,
            "promotional_copy": {
                "ad": ad_copy,
                "affiliate": affiliate_copy,
            },
        }
