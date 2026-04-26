from __future__ import annotations

from typing import Any

from app.services.story_campaign_fit_service import StoryCampaignFitService
from app.services.story_discovery_signal_service import StoryDiscoverySignalService
from app.services.story_quality_score_service import StoryQualityScoreService


class StoryMarketPositionService:
    """
    Canonical market-position engine.

    Converts story quality + campaign fitness into product-level
    market posture for the dBaronX ecosystem:
    - premium launch
    - discovery push
    - affiliate-led growth
    - watch-led traffic testing
    - revise before spend
    """

    def __init__(
        self,
        *,
        campaign_fit_service: StoryCampaignFitService | None = None,
        discovery_signal_service: StoryDiscoverySignalService | None = None,
        quality_score_service: StoryQualityScoreService | None = None,
    ) -> None:
        self.campaign_fit_service = campaign_fit_service or StoryCampaignFitService()
        self.discovery_signal_service = (
            discovery_signal_service or StoryDiscoverySignalService()
        )
        self.quality_score_service = quality_score_service or StoryQualityScoreService()

    async def evaluate(
        self,
        *,
        title: str,
        content: str,
        creator_profile: dict[str, Any],
        prompt: str | None = None,
        language: str | None = None,
        tags: list[str] | None = None,
        market_context: dict[str, Any] | None = None,
        comparison_contents: list[str] | None = None,
    ) -> dict[str, Any]:
        quality = self.quality_score_service.score(
            title=title,
            content=content,
            prompt=prompt,
            comparison_contents=comparison_contents,
            language=language,
        )
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
        campaign_fit = await self.campaign_fit_service.evaluate(
            title=title,
            content=content,
            prompt=prompt,
            language=language,
            tags=tags,
            creator_profile=creator_profile,
            market_context=market_context,
            comparison_contents=comparison_contents,
        )

        position_score = self._position_score(
            quality_score=quality["score"]["value"],
            discovery_score=discovery["ranking"]["feed_fit_score"],
            campaign_fit=campaign_fit["campaign_fit"],
        )
        market_position = self._market_position(
            position_score=position_score,
            quality_score=quality["score"]["value"],
            best_channel=campaign_fit["campaign_fit"]["best_channel"],
        )

        launch_strategy = self._launch_strategy(
            market_position=market_position,
            best_channel=campaign_fit["campaign_fit"]["best_channel"],
            discovery_score=discovery["ranking"]["feed_fit_score"],
        )

        return {
            "success": True,
            "market_position": {
                "position_score": position_score,
                "position": market_position,
                "launch_strategy": launch_strategy,
                "best_channel": campaign_fit["campaign_fit"]["best_channel"],
            },
            "inputs": {
                "quality_score": quality["score"],
                "discovery_ranking": discovery["ranking"],
                "campaign_fit": campaign_fit["campaign_fit"],
            },
        }

    def _position_score(
        self,
        *,
        quality_score: int,
        discovery_score: int,
        campaign_fit: dict[str, Any],
    ) -> int:
        channel_strength = max(
            int(campaign_fit["discovery_campaign_fit"]),
            int(campaign_fit["affiliate_campaign_fit"]),
            int(campaign_fit["watch_campaign_fit"]),
            int(campaign_fit["featured_campaign_fit"]),
        )
        score = quality_score * 0.42 + discovery_score * 0.33 + channel_strength * 0.25
        return max(0, min(100, int(round(score))))

    def _market_position(
        self,
        *,
        position_score: int,
        quality_score: int,
        best_channel: str,
    ) -> str:
        if position_score >= 88 and quality_score >= 84:
            return "premium_launch"
        if position_score >= 80 and best_channel == "featured":
            return "featured_growth"
        if position_score >= 74 and best_channel == "affiliate":
            return "affiliate_led"
        if position_score >= 70 and best_channel == "watch":
            return "watch_validation"
        if position_score >= 66:
            return "discovery_push"
        return "revise_before_spend"

    def _launch_strategy(
        self,
        *,
        market_position: str,
        best_channel: str,
        discovery_score: int,
    ) -> dict[str, Any]:
        if market_position == "premium_launch":
            return {
                "phase": "immediate_paid_push",
                "budget_posture": "aggressive",
                "discovery_weight": 0.45,
                "affiliate_weight": 0.25,
                "watch_weight": 0.15,
                "featured_weight": 0.15,
            }
        if market_position == "featured_growth":
            return {
                "phase": "featured_slot_push",
                "budget_posture": "strong",
                "discovery_weight": 0.30,
                "affiliate_weight": 0.20,
                "watch_weight": 0.10,
                "featured_weight": 0.40,
            }
        if market_position == "affiliate_led":
            return {
                "phase": "creator_referral_scaling",
                "budget_posture": "efficient",
                "discovery_weight": 0.20,
                "affiliate_weight": 0.50,
                "watch_weight": 0.10,
                "featured_weight": 0.20,
            }
        if market_position == "watch_validation":
            return {
                "phase": "watch_to_earn_testing",
                "budget_posture": "measured",
                "discovery_weight": 0.20,
                "affiliate_weight": 0.15,
                "watch_weight": 0.50,
                "featured_weight": 0.15,
            }
        if market_position == "discovery_push":
            return {
                "phase": "organic_plus_light_paid",
                "budget_posture": "light",
                "discovery_weight": 0.55,
                "affiliate_weight": 0.20,
                "watch_weight": 0.15,
                "featured_weight": 0.10,
            }
        return {
            "phase": "revise_then_retest",
            "budget_posture": "hold",
            "discovery_weight": 0.0,
            "affiliate_weight": 0.0,
            "watch_weight": 0.0,
            "featured_weight": 0.0,
            "focus": f"Improve fit before activating {best_channel} or discovery score {discovery_score}",
        }
