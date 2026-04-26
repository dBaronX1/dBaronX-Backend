from __future__ import annotations

from typing import Any

from app.services.story_excerpt_service import StoryExcerptService
from app.services.story_metadata_assembly_service import StoryMetadataAssemblyService
from app.services.story_quality_score_service import StoryQualityScoreService


class StoryPublicationReadinessService:
    """
    Canonical publication gate for AI Stories.

    Purpose:
    - one publication decision surface for NestJS
    - creator-facing publishing checklist
    - moderation + quality + metadata readiness
    - promotion eligibility pre-check
    """

    def __init__(
        self,
        *,
        quality_score_service: StoryQualityScoreService | None = None,
        metadata_service: StoryMetadataAssemblyService | None = None,
        excerpt_service: StoryExcerptService | None = None,
    ) -> None:
        self.quality_score_service = quality_score_service or StoryQualityScoreService()
        self.metadata_service = metadata_service or StoryMetadataAssemblyService()
        self.excerpt_service = excerpt_service or StoryExcerptService()

    async def evaluate(
        self,
        *,
        title: str,
        content: str,
        prompt: str | None = None,
        comparison_contents: list[str] | None = None,
        language: str | None = None,
        require_excerpt: bool = True,
        require_summary: bool = True,
    ) -> dict[str, Any]:
        quality = self.quality_score_service.score(
            title=title,
            content=content,
            prompt=prompt,
            comparison_contents=comparison_contents,
            language=language,
        )

        metadata_bundle = await self.metadata_service.assemble(
            content=content,
            prompt=prompt,
            title=title,
            language=language,
        )

        excerpt_bundle = self.excerpt_service.generate_excerpt(
            content=content,
            max_chars=260,
            max_sentences=3,
            preserve_hook=True,
        )

        metadata = metadata_bundle["metadata"]
        checks = self._checks(
            title=title,
            content=content,
            quality=quality,
            metadata=metadata,
            excerpt_bundle=excerpt_bundle,
            require_excerpt=require_excerpt,
            require_summary=require_summary,
        )

        blocking_issues = [item["message"] for item in checks if item["level"] == "block"]
        warnings = [item["message"] for item in checks if item["level"] == "warn"]

        publication_ready = len(blocking_issues) == 0
        promotion_ready = publication_ready and quality["score"]["promotion_ready"]

        return {
            "success": True,
            "publication_ready": publication_ready,
            "promotion_ready": promotion_ready,
            "quality": quality["score"],
            "checks": checks,
            "blocking_issues": blocking_issues,
            "warnings": warnings,
            "metadata": metadata,
            "excerpt": excerpt_bundle["excerpt"],
            "recommended_actions": self._recommended_actions(checks),
        }

    def _checks(
        self,
        *,
        title: str,
        content: str,
        quality: dict[str, Any],
        metadata: dict[str, Any],
        excerpt_bundle: dict[str, Any],
        require_excerpt: bool,
        require_summary: bool,
    ) -> list[dict[str, Any]]:
        checks: list[dict[str, Any]] = []

        if len(title.strip()) < 8:
            checks.append({"code": "title_short", "level": "block", "message": "Title is too short."})

        if len(content.strip().split()) < 220:
            checks.append({"code": "content_short", "level": "block", "message": "Story is too short for publication."})

        if quality["moderation"]["blocked"]:
            checks.append({"code": "moderation_blocked", "level": "block", "message": "Story failed moderation."})

        if quality["score"]["value"] < 72:
            checks.append(
                {
                    "code": "quality_low",
                    "level": "block",
                    "message": "Quality score is below publication threshold.",
                }
            )

        if require_excerpt and not excerpt_bundle.get("excerpt"):
            checks.append({"code": "excerpt_missing", "level": "block", "message": "Excerpt generation failed."})

        if require_summary and not metadata.get("summary"):
            checks.append({"code": "summary_missing", "level": "warn", "message": "Summary is weak or missing."})

        if not metadata.get("genre"):
            checks.append({"code": "genre_missing", "level": "warn", "message": "Genre classification is missing."})

        if not metadata.get("tags"):
            checks.append({"code": "tags_missing", "level": "warn", "message": "Tag generation is missing."})

        if quality["duplicate_analysis"] and quality["duplicate_analysis"]["duplicate_found"]:
            checks.append(
                {
                    "code": "duplicate_risk",
                    "level": "block",
                    "message": "Story is too similar to an existing story.",
                }
            )

        if quality["metrics"]["mechanics_score"] < 60:
            checks.append(
                {
                    "code": "mechanics_low",
                    "level": "warn",
                    "message": "Grammar or punctuation quality should be improved.",
                }
            )

        if quality["metrics"]["hook_strength"] < 60:
            checks.append(
                {
                    "code": "hook_weak",
                    "level": "warn",
                    "message": "Opening hook is weak for mobile readers.",
                }
            )

        return checks

    def _recommended_actions(self, checks: list[dict[str, Any]]) -> list[str]:
        actions: list[str] = []
        codes = {item["code"] for item in checks}

        if "title_short" in codes:
            actions.append("Rewrite the title with stronger tension and clarity.")
        if "content_short" in codes:
            actions.append("Expand the story before publishing.")
        if "quality_low" in codes:
            actions.append("Revise pacing, readability, and structure before publishing.")
        if "mechanics_low" in codes:
            actions.append("Run a rewrite pass focused on grammar and sentence flow.")
        if "hook_weak" in codes:
            actions.append("Improve the opening paragraph and title for stronger CTR.")
        if "duplicate_risk" in codes:
            actions.append("Differentiate plot structure, opening, and language from similar stories.")
        return actions
