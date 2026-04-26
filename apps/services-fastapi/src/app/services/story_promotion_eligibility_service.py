from __future__ import annotations

from typing import Any

from app.services.story_campaign_fit_service import StoryCampaignFitService
from app.services.story_creator_signal_service import StoryCreatorSignalService
from app.services.story_publication_readiness_service import (
    StoryPublicationReadinessService,
)


class StoryPromotionEligibilityService:
    """
    Canonical eligibility gate for AI Story promotion spend.

    Used before NestJS creates:
    - story promotion quotes
    - featured discovery placements
    - affiliate story campaigns
    - watch-to-earn story campaigns
    """

    def __init__(
        self,
        *,
        publication_readiness_service: StoryPublicationReadinessService | None = None,
        creator_signal_service: StoryCreatorSignalService | None = None,
        campaign_fit_service: StoryCampaignFitService | None = None,
    ) -> None:
        self.publication_readiness_service = (
            publication_readiness_service or StoryPublicationReadinessService()
        )
        self.creator_signal_service = (
            creator_signal_service or StoryCreatorSignalService()
        )
        self.campaign_fit_service = campaign_fit_service or StoryCampaignFitService()

    async def evaluate(
        self,
        *,
        title: str,
        content: str,
        creator_profile: dict[str, Any],
        prompt: str | None = None,
        language: str | None = None,
        tags: list[str] | None = None,
        target_channel: str = "discovery",
        comparison_contents: list[str] | None = None,
        market_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        publication = await self.publication_readiness_service.evaluate(
            title=title,
            content=content,
            prompt=prompt,
            comparison_contents=comparison_contents,
            language=language,
            require_excerpt=True,
            require_summary=True,
        )
        creator = self.creator_signal_service.evaluate(
            total_published=int(creator_profile.get("total_published", 0)),
            publication_acceptance_rate=float(
                creator_profile.get("publication_acceptance_rate", 0.0)
            ),
            moderation_rejection_rate=float(
                creator_profile.get("moderation_rejection_rate", 0.0)
            ),
            average_story_quality_score=float(
                creator_profile.get("average_story_quality_score", 0.0)
            ),
            average_completion_rate=creator_profile.get("average_completion_rate"),
            average_share_rate=creator_profile.get("average_share_rate"),
            average_save_rate=creator_profile.get("average_save_rate"),
            recent_policy_flags=int(creator_profile.get("recent_policy_flags", 0)),
            days_since_first_publish=creator_profile.get("days_since_first_publish"),
        )
        fit = await self.campaign_fit_service.evaluate(
            title=title,
            content=content,
            prompt=prompt,
            language=language,
            tags=tags,
            creator_profile=creator_profile,
            market_context=market_context,
            comparison_contents=comparison_contents,
        )

        normalized_channel = self._normalize_channel(target_channel)
        channel_score = int(fit["campaign_fit"][f"{normalized_channel}_campaign_fit"])

        reasons: list[str] = []
        eligible = True

        if not publication["publication_ready"]:
            eligible = False
            reasons.append("story_not_publication_ready")

        if creator["creator_signals"]["trust_band"] == "restricted":
            eligible = False
            reasons.append("creator_restricted")

        minimums = {
            "discovery": 62,
            "affiliate": 66,
            "watch": 72,
            "featured": 80,
        }
        if channel_score < minimums[normalized_channel]:
            eligible = False
            reasons.append("channel_fit_below_threshold")

        if int(publication["quality"]["value"]) < 64:
            eligible = False
            reasons.append("quality_score_too_low")

        return {
            "success": True,
            "story_promotion_eligibility": {
                "eligible": eligible,
                "target_channel": normalized_channel,
                "channel_fit_score": channel_score,
                "publication": publication,
                "creator": creator["creator_signals"],
                "campaign_fit": fit["campaign_fit"],
                "reasons": reasons,
            },
        }

    def _normalize_channel(self, value: str) -> str:
        normalized = str(value).strip().lower()
        allowed = {"discovery", "affiliate", "watch", "featured"}
        if normalized not in allowed:
            raise ValueError("target_channel must be one of discovery, affiliate, watch, featured")
        return normalized
