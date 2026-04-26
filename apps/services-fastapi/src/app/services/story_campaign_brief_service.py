from __future__ import annotations

from typing import Any

from app.services.story_ad_copy_service import StoryAdCopyService
from app.services.story_affiliate_copy_service import StoryAffiliateCopyService
from app.services.story_campaign_fit_service import StoryCampaignFitService
from app.services.story_teaser_variant_service import StoryTeaserVariantService


class StoryCampaignBriefService:
    """
    Campaign brief builder.

    Produces a compact monetization-ready brief for NestJS campaign orchestration:
    - recommended surface
    - creative starter copy
    - teaser variants
    - affiliate starter messaging
    - watch-to-earn suitability summary
    """

    def __init__(
        self,
        *,
        campaign_fit_service: StoryCampaignFitService | None = None,
        teaser_variant_service: StoryTeaserVariantService | None = None,
        affiliate_copy_service: StoryAffiliateCopyService | None = None,
        ad_copy_service: StoryAdCopyService | None = None,
    ) -> None:
        self.campaign_fit_service = campaign_fit_service or StoryCampaignFitService()
        self.teaser_variant_service = (
            teaser_variant_service or StoryTeaserVariantService()
        )
        self.affiliate_copy_service = (
            affiliate_copy_service or StoryAffiliateCopyService()
        )
        self.ad_copy_service = ad_copy_service or StoryAdCopyService()

    async def build(
        self,
        *,
        title: str,
        excerpt: str,
        content: str,
        creator_profile: dict[str, Any],
        genre: str | None = None,
        tone: str | None = None,
        audience: str | None = None,
        creator_name: str | None = None,
        tags: list[str] | None = None,
        prompt: str | None = None,
        language: str | None = None,
        market_context: dict[str, Any] | None = None,
        comparison_contents: list[str] | None = None,
    ) -> dict[str, Any]:
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

        teaser_variants = self.teaser_variant_service.build(
            title=title,
            excerpt=excerpt,
            genre=genre,
            tone=tone,
            audience=audience,
            cta_target="discover",
            max_variants=4,
        )

        affiliate_copy = self.affiliate_copy_service.build(
            title=title,
            excerpt=excerpt,
            genre=genre,
            tone=tone,
            creator_name=creator_name,
            audience=audience,
        )

        ad_copy = self.ad_copy_service.build(
            title=title,
            excerpt=excerpt,
            genre=genre,
            tone=tone,
            audience=audience,
            campaign_goal=self._campaign_goal(fit["campaign_fit"]["best_channel"]),
        )

        best_channel = fit["campaign_fit"]["best_channel"]

        return {
            "success": True,
            "brief": {
                "best_channel": best_channel,
                "channel_fit": fit["campaign_fit"],
                "teasers": teaser_variants["variants"],
                "affiliate_copy": affiliate_copy["copy"],
                "ad_copy": ad_copy["ad_copy"],
                "watch_summary": self._watch_summary(
                    best_channel=best_channel,
                    channel_fit=fit["campaign_fit"],
                ),
            },
        }

    def _campaign_goal(self, best_channel: str) -> str:
        if best_channel == "affiliate":
            return "shares"
        if best_channel == "watch":
            return "engagement"
        if best_channel == "featured":
            return "reads"
        return "reads"

    def _watch_summary(self, *, best_channel: str, channel_fit: dict[str, Any]) -> dict[str, Any]:
        watch_fit = int(channel_fit["watch_campaign_fit"])
        return {
            "best_for_watch": best_channel == "watch" or watch_fit >= 74,
            "watch_campaign_fit": watch_fit,
            "recommended_teaser_seconds": 12 if watch_fit >= 82 else 18,
            "recommended_cta_style": "curiosity" if watch_fit >= 78 else "direct",
        }
