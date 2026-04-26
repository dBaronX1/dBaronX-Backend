from __future__ import annotations

from typing import Any

from app.services.story_promotion_eligibility_service import (
    StoryPromotionEligibilityService,
)


class StoryQuoteSignalService:
    """
    Canonical quote-signal engine for NestJS story promotion quoting.

    It does not price campaigns directly.
    It returns multiplier-ready intelligence:
    - channel pressure
    - creator quality weight
    - review requirement
    - fit-based discount/surcharge hint
    """

    def __init__(
        self,
        *,
        story_promotion_eligibility_service: StoryPromotionEligibilityService | None = None,
    ) -> None:
        self.story_promotion_eligibility_service = (
            story_promotion_eligibility_service or StoryPromotionEligibilityService()
        )

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
        eligibility = await self.story_promotion_eligibility_service.evaluate(
            title=title,
            content=content,
            creator_profile=creator_profile,
            prompt=prompt,
            language=language,
            tags=tags,
            target_channel=target_channel,
            comparison_contents=comparison_contents,
            market_context=market_context,
        )

        data = eligibility["story_promotion_eligibility"]
        fit = int(data["channel_fit_score"])
        creator_trust = str(data["creator"]["trust_band"])

        quote_multiplier = self._quote_multiplier(
            target_channel=data["target_channel"],
            fit_score=fit,
            creator_trust=creator_trust,
        )

        return {
            "success": True,
            "story_quote_signal": {
                "eligible": data["eligible"],
                "target_channel": data["target_channel"],
                "channel_fit_score": fit,
                "creator_trust_band": creator_trust,
                "quote_multiplier": quote_multiplier,
                "manual_review_required": (
                    not data["eligible"] or creator_trust in {"guarded", "restricted"}
                ),
                "reasons": data["reasons"],
            },
        }

    def _quote_multiplier(
        self,
        *,
        target_channel: str,
        fit_score: int,
        creator_trust: str,
    ) -> float:
        base = {
            "discovery": 1.00,
            "affiliate": 1.08,
            "watch": 1.18,
            "featured": 1.32,
        }[target_channel]

        if fit_score >= 88:
            base *= 0.92
        elif fit_score >= 78:
            base *= 0.97
        elif fit_score < 66:
            base *= 1.12

        if creator_trust == "trusted_elite":
            base *= 0.94
        elif creator_trust == "trusted":
            base *= 0.98
        elif creator_trust == "guarded":
            base *= 1.08
        elif creator_trust == "restricted":
            base *= 1.22

        return round(base, 4)
