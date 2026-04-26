from __future__ import annotations

from typing import Any

from app.services.story_creator_signal_service import StoryCreatorSignalService
from app.services.story_discovery_signal_service import StoryDiscoverySignalService


class StoryCampaignFitService:
    """
    Campaign-fit engine for matching stories to monetization surfaces.

    Surfaces:
    - discovery promotion
    - affiliate promotion
    - watch-to-earn teaser campaigns
    - featured story premium placements
    """

    def __init__(
        self,
        *,
        discovery_signal_service: StoryDiscoverySignalService | None = None,
        creator_signal_service: StoryCreatorSignalService | None = None,
    ) -> None:
        self.discovery_signal_service = (
            discovery_signal_service or StoryDiscoverySignalService()
        )
        self.creator_signal_service = creator_signal_service or StoryCreatorSignalService()

    async def evaluate(
        self,
        *,
        title: str,
        content: str,
        prompt: str | None = None,
        language: str | None = None,
        tags: list[str] | None = None,
        creator_profile: dict[str, Any],
        market_context: dict[str, Any] | None = None,
        comparison_contents: list[str] | None = None,
    ) -> dict[str, Any]:
        discovery = await self.discovery_signal_service.evaluate(
            title=title,
            content=content,
            prompt=prompt,
            language=language,
            tags=tags,
            historical_ctr=market_context.get("historical_ctr") if market_context else None,
            completion_rate=market_context.get("completion_rate") if market_context else None,
            save_rate=market_context.get("save_rate") if market_context else None,
            share_rate=market_context.get("share_rate") if market_context else None,
            recency_hours=market_context.get("recency_hours") if market_context else None,
            comparison_contents=comparison_contents,
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

        discovery_score = int(discovery["ranking"]["feed_fit_score"])
        creator_score = float(creator["creator_signals"]["trust_score"])

        discovery_campaign_fit = self._fit_score(discovery_score, creator_score, 0.55, 0.45)
        affiliate_campaign_fit = self._affiliate_fit(
            discovery_score=discovery_score,
            creator_score=creator_score,
            tags=tags or [],
            language=language,
        )
        watch_campaign_fit = self._watch_fit(
            discovery_score=discovery_score,
            creator_score=creator_score,
            content=content,
        )
        featured_campaign_fit = self._featured_fit(discovery_score, creator_score)

        best_channel = self._best_channel(
            discovery_campaign_fit=discovery_campaign_fit,
            affiliate_campaign_fit=affiliate_campaign_fit,
            watch_campaign_fit=watch_campaign_fit,
            featured_campaign_fit=featured_campaign_fit,
        )

        return {
            "success": True,
            "campaign_fit": {
                "discovery_campaign_fit": discovery_campaign_fit,
                "affiliate_campaign_fit": affiliate_campaign_fit,
                "watch_campaign_fit": watch_campaign_fit,
                "featured_campaign_fit": featured_campaign_fit,
                "best_channel": best_channel,
            },
            "inputs": {
                "discovery": discovery["ranking"],
                "creator": creator["creator_signals"],
            },
        }

    def _fit_score(
        self,
        discovery_score: float,
        creator_score: float,
        discovery_weight: float,
        creator_weight: float,
    ) -> int:
        score = discovery_score * discovery_weight + creator_score * creator_weight
        return max(0, min(100, int(round(score))))

    def _affiliate_fit(
        self,
        *,
        discovery_score: float,
        creator_score: float,
        tags: list[str],
        language: str | None,
    ) -> int:
        score = self._fit_score(discovery_score, creator_score, 0.48, 0.52)
        if tags:
            score += min(6, len(tags))
        if language and language.lower() != "en":
            score += 2
        return max(0, min(100, score))

    def _watch_fit(
        self,
        *,
        discovery_score: float,
        creator_score: float,
        content: str,
    ) -> int:
        score = self._fit_score(discovery_score, creator_score, 0.64, 0.36)
        opener_words = len(content.split()[:60])
        if opener_words >= 40:
            score += 3
        if "?" in content[:400]:
            score += 2
        return max(0, min(100, score))

    def _featured_fit(self, discovery_score: float, creator_score: float) -> int:
        score = self._fit_score(discovery_score, creator_score, 0.7, 0.3)
        if discovery_score >= 88 and creator_score >= 82:
            score += 4
        return max(0, min(100, score))

    def _best_channel(
        self,
        *,
        discovery_campaign_fit: int,
        affiliate_campaign_fit: int,
        watch_campaign_fit: int,
        featured_campaign_fit: int,
    ) -> str:
        channels = {
            "discovery": discovery_campaign_fit,
            "affiliate": affiliate_campaign_fit,
            "watch": watch_campaign_fit,
            "featured": featured_campaign_fit,
        }
        return max(channels.items(), key=lambda item: item[1])[0]
