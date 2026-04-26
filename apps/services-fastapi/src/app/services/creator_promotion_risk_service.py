from __future__ import annotations

from typing import Any

from app.services.account_trust_profile_service import AccountTrustProfileService
from app.services.story_promotion_eligibility_service import (
    StoryPromotionEligibilityService,
)


class CreatorPromotionRiskService:
    """
    Canonical risk layer for creator-funded story promotion.

    Designed for NestJS quote/payment/promotion orchestration.
    Combines:
    - creator trust
    - story promotion eligibility
    - spend pattern anomalies
    """

    def __init__(
        self,
        *,
        account_trust_profile_service: AccountTrustProfileService | None = None,
        story_promotion_eligibility_service: StoryPromotionEligibilityService | None = None,
    ) -> None:
        self.account_trust_profile_service = (
            account_trust_profile_service or AccountTrustProfileService()
        )
        self.story_promotion_eligibility_service = (
            story_promotion_eligibility_service or StoryPromotionEligibilityService()
        )

    async def evaluate(
        self,
        *,
        creator_account_id: str,
        title: str,
        content: str,
        creator_profile: dict[str, Any],
        target_channel: str,
        proposed_spend_amount: float,
        prompt: str | None = None,
        language: str | None = None,
        tags: list[str] | None = None,
        comparison_contents: list[str] | None = None,
        market_context: dict[str, Any] | None = None,
        story_promotion_count_30d: int = 0,
        creator_chargebacks_365d: int = 0,
        average_story_spend_90d: float | None = None,
    ) -> dict[str, Any]:
        safe_creator_account_id = self._require(
            creator_account_id,
            "creator_account_id",
        )

        trust = self.account_trust_profile_service.evaluate(
            account_id=safe_creator_account_id,
            account_age_days=int(creator_profile.get("account_age_days", 0)),
            email_verified=bool(creator_profile.get("email_verified", False)),
            phone_verified=bool(creator_profile.get("phone_verified", False)),
            completed_orders=int(creator_profile.get("completed_orders", 0)),
            successful_watches_30d=int(creator_profile.get("successful_watches_30d", 0)),
            denied_watches_30d=int(creator_profile.get("denied_watches_30d", 0)),
            affiliate_payout_rejections_180d=int(
                creator_profile.get("affiliate_payout_rejections_180d", 0)
            ),
            chargebacks_365d=creator_chargebacks_365d,
            policy_flags_180d=int(creator_profile.get("recent_policy_flags", 0)),
            device_count_30d=int(creator_profile.get("device_count_30d", 1)),
        )
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

        trust_score = float(trust["account_trust"]["trust_score"])
        risk_score = (100.0 - trust_score) * 0.38
        reasons: list[str] = []

        if not eligibility["story_promotion_eligibility"]["eligible"]:
            risk_score += 30.0
            reasons.append("promotion_ineligible_story")

        if proposed_spend_amount >= 1000:
            risk_score += 12.0
            reasons.append("high_promotion_spend")
        elif proposed_spend_amount >= 300:
            risk_score += 5.0
            reasons.append("elevated_promotion_spend")

        if story_promotion_count_30d >= 12:
            risk_score += 10.0
            reasons.append("promotion_volume_spike")

        if average_story_spend_90d is not None and average_story_spend_90d > 0:
            if proposed_spend_amount >= average_story_spend_90d * 3:
                risk_score += 14.0
                reasons.append("promotion_spend_spike")

        if creator_chargebacks_365d >= 1:
            risk_score += min(26.0, creator_chargebacks_365d * 13.0)
            reasons.append("creator_chargebacks")

        decision = self._decision(risk_score)

        return {
            "success": True,
            "creator_promotion_risk": {
                "creator_account_id": safe_creator_account_id,
                "decision": decision,
                "allow": decision == "allow",
                "risk_score": round(min(100.0, risk_score), 2),
                "trust": trust["account_trust"],
                "eligibility": eligibility["story_promotion_eligibility"],
                "reasons": reasons,
            },
        }

    def _decision(self, score: float) -> str:
        if score >= 72:
            return "deny"
        if score >= 46:
            return "review"
        return "allow"

    def _require(self, value: str, field_name: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
