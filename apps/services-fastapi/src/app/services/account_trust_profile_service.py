from __future__ import annotations

from typing import Any


class AccountTrustProfileService:
    """
    Canonical account trust profile service.

    Produces a compact trust profile for:
    - W2E reward decisions
    - affiliate payout gating
    - payment risk shaping
    - story promotion quality gating
    """

    def evaluate(
        self,
        *,
        account_id: str,
        account_age_days: int = 0,
        email_verified: bool = False,
        phone_verified: bool = False,
        completed_orders: int = 0,
        successful_watches_30d: int = 0,
        denied_watches_30d: int = 0,
        affiliate_payout_rejections_180d: int = 0,
        chargebacks_365d: int = 0,
        policy_flags_180d: int = 0,
        device_count_30d: int = 1,
    ) -> dict[str, Any]:
        safe_account_id = self._require(account_id, "account_id")

        trust_score = 18.0
        reasons_positive: list[str] = []
        reasons_negative: list[str] = []

        if account_age_days >= 180:
            trust_score += 18.0
            reasons_positive.append("mature_account")
        elif account_age_days >= 30:
            trust_score += 8.0
            reasons_positive.append("established_account")

        if email_verified:
            trust_score += 12.0
            reasons_positive.append("email_verified")

        if phone_verified:
            trust_score += 10.0
            reasons_positive.append("phone_verified")

        if completed_orders >= 3:
            trust_score += min(16.0, completed_orders * 2.5)
            reasons_positive.append("order_history")

        if successful_watches_30d >= 20:
            trust_score += 10.0
            reasons_positive.append("healthy_watch_history")

        if denied_watches_30d >= 5:
            trust_score -= min(20.0, denied_watches_30d * 2.5)
            reasons_negative.append("watch_denials")

        if affiliate_payout_rejections_180d >= 1:
            trust_score -= min(18.0, affiliate_payout_rejections_180d * 9.0)
            reasons_negative.append("affiliate_payout_rejections")

        if chargebacks_365d >= 1:
            trust_score -= min(28.0, chargebacks_365d * 14.0)
            reasons_negative.append("chargebacks")

        if policy_flags_180d >= 1:
            trust_score -= min(24.0, policy_flags_180d * 8.0)
            reasons_negative.append("policy_flags")

        if device_count_30d >= 6:
            trust_score -= min(14.0, device_count_30d * 1.8)
            reasons_negative.append("high_device_count")

        trust_score = max(0.0, min(100.0, trust_score))
        trust_band = self._trust_band(trust_score)

        return {
            "success": True,
            "account_trust": {
                "account_id": safe_account_id,
                "trust_score": round(trust_score, 2),
                "trust_band": trust_band,
                "eligible_for_priority_rewards": trust_score >= 70,
                "signals": {
                    "account_age_days": account_age_days,
                    "email_verified": email_verified,
                    "phone_verified": phone_verified,
                    "completed_orders": completed_orders,
                    "successful_watches_30d": successful_watches_30d,
                    "denied_watches_30d": denied_watches_30d,
                    "affiliate_payout_rejections_180d": affiliate_payout_rejections_180d,
                    "chargebacks_365d": chargebacks_365d,
                    "policy_flags_180d": policy_flags_180d,
                    "device_count_30d": device_count_30d,
                },
                "positive_reasons": reasons_positive,
                "negative_reasons": reasons_negative,
            },
        }

    def _trust_band(self, score: float) -> str:
        if score >= 82:
            return "high"
        if score >= 58:
            return "medium"
        return "low"

    def _require(self, value: str, field_name: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
