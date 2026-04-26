from __future__ import annotations

from typing import Any

from app.services.story_classification_service import StoryClassificationService
from app.services.story_excerpt_service import StoryExcerptService
from app.services.story_summary_service import StorySummaryService
from app.services.story_tag_generation_service import StoryTagGenerationService


class StoryMetadataAssemblyService:
    """
    Canonical metadata consolidator.

    Produces one uniform metadata package for:
    - NestJS persistence
    - discovery/search indexing
    - affiliate promotion tooling
    - ad campaign creative generation
    - mobile feed preview cards
    """

    def __init__(
        self,
        *,
        classification_service: StoryClassificationService | None = None,
        excerpt_service: StoryExcerptService | None = None,
        summary_service: StorySummaryService | None = None,
        tag_generation_service: StoryTagGenerationService | None = None,
    ) -> None:
        self.classification_service = classification_service or StoryClassificationService()
        self.excerpt_service = excerpt_service or StoryExcerptService()
        self.summary_service = summary_service or StorySummaryService()
        self.tag_generation_service = tag_generation_service or StoryTagGenerationService()

    async def assemble(
        self,
        *,
        content: str,
        prompt: str | None = None,
        title: str | None = None,
        language: str | None = None,
        audience: str | None = None,
    ) -> dict[str, Any]:
        classification = self.classification_service.classify(
            content=content,
            prompt=prompt,
            title=title,
        )

        tag_bundle = self.tag_generation_service.generate_tags(
            content=content,
            prompt=prompt,
            title=title,
            max_tags=12,
        )

        excerpt_bundle = self.excerpt_service.generate_excerpt(
            content=content,
            max_chars=260,
            max_sentences=3,
            preserve_hook=True,
        )

        summary_bundle = await self.summary_service.summarize(
            content=content,
            summary_style="reader_preview",
            target_sentences=4,
            language=language,
            spoiler_safe=True,
        )

        canonical_language = (
            language
            or self._derive_language_hint(content)
            or "en"
        )

        return {
            "success": True,
            "metadata": {
                "title": title.strip() if title else None,
                "language": canonical_language,
                "audience": audience or classification["audience"],
                "genre": classification["genre"],
                "tone": classification["tone"],
                "tags": tag_bundle["tags"],
                "excerpt": excerpt_bundle["excerpt"],
                "summary": summary_bundle["summary"] if summary_bundle["success"] else "",
                "classification": classification,
                "summary_meta": summary_bundle.get("meta"),
                "excerpt_meta": excerpt_bundle.get("meta"),
                "recommendation_inputs": {
                    "genre": classification["genre"],
                    "tone": classification["tone"],
                    "audience": audience or classification["audience"],
                    "tags": tag_bundle["tags"],
                },
            },
            "providers": {
                "summary": summary_bundle.get("provider"),
                "classification": "deterministic",
                "tags": "deterministic",
                "excerpt": "deterministic",
            },
            "signals": {
                "summary_success": summary_bundle["success"],
                "excerpt_success": excerpt_bundle["success"],
                "moderation": summary_bundle.get("moderation"),
            },
        }

    def _derive_language_hint(self, content: str) -> str | None:
        ascii_chars = sum(1 for c in content if ord(c) < 128)
        ratio = ascii_chars / max(len(content), 1)
        if ratio > 0.95:
            return "en"
        return None
