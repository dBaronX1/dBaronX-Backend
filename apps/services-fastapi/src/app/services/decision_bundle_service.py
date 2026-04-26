from __future__ import annotations

from typing import Any

from app.services.creator_promotion_risk_service import CreatorPromotionRiskService
from app.services.fraud_decision_service import FraudDecisionService
from app.services.payment_preflight_decision_service import (
    PaymentPreflightDecisionService,
)
from app.services.story_quote_signal_service import StoryQuoteSignalService
from app.services.w2e_reward_decision_service import W2ERewardDecisionService


class DecisionBundleService:
    """
    Canonical orchestration bundle for multi-surface decision generation.

    This is designed for NestJS batch-style orchestration where one action may
    need multiple decision payloads at once, while keeping one stable response.
    """

    def __init__(
        self,
        *,
        fraud_decision_service: FraudDecisionService | None = None,
        w2e_reward_decision_service: W2ERewardDecisionService | None = None,
        payment_preflight_decision_service: PaymentPreflightDecisionService | None = None,
        creator_promotion_risk_service: CreatorPromotionRiskService | None = None,
        story_quote_signal_service: StoryQuoteSignalService | None = None,
    ) -> None:
        self.fraud_decision_service = (
            fraud_decision_service or FraudDecisionService()
        )
        self.w2e_reward_decision_service = (
            w2e_reward_decision_service or W2ERewardDecisionService()
        )
        self.payment_preflight_decision_service = (
            payment_preflight_decision_service or PaymentPreflightDecisionService()
        )
        self.creator_promotion_risk_service = (
            creator_promotion_risk_service or CreatorPromotionRiskService()
        )
        self.story_quote_signal_service = (
            story_quote_signal_service or StoryQuoteSignalService()
        )

    async def build(
        self,
        *,
        bundle_type: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        normalized_bundle_type = self._normalize_bundle_type(bundle_type)

        if normalized_bundle_type == "watch_reward":
            reward_decision = self.w2e_reward_decision_service.decide(**payload)
            fraud_decision = self.fraud_decision_service.decide(
                flow_type="watch",
                account_id=payload["account_id"],
                ip=payload["ip"],
                headers=payload["headers"],
                session_payload={
                    "session_id": payload["session_id"],
                    "declared_duration_seconds": payload["declared_duration_seconds"],
                    "heartbeat_intervals_ms": payload["heartbeat_intervals_ms"],
                    "total_heartbeats": payload["total_heartbeats"],
                    "hidden_event_count": payload.get("hidden_event_count", 0),
                    "blur_event_count": payload.get("blur_event_count", 0),
                    "seek_event_count": payload.get("seek_event_count", 0),
                    "playback_rate_max": payload.get("playback_rate_max", 1.0),
                    "muted_ratio": payload.get("muted_ratio", 0.0),
                    "duplicate_claim_attempts": payload.get("duplicate_claim_attempts", 0),
                    "recent_ip_events": payload.get("recent_ip_events", []),
                    "distinct_accounts_24h": payload.get("distinct_accounts_24h", 0),
                    "failed_captcha_1h": payload.get("failed_captcha_1h", 0),
                    "denied_watch_claims_24h": payload.get("denied_watch_claims_24h", 0),
                },
                account_profile={
                    "account_age_days": payload.get("account_age_days", 0),
                    "email_verified": payload.get("email_verified", False),
                    "phone_verified": payload.get("phone_verified", False),
                    "completed_orders": payload.get("completed_orders", 0),
                    "successful_watches_30d": payload.get("successful_watches_30d", 0),
                    "denied_watches_30d": payload.get("denied_watches_30d", 0),
                    "affiliate_payout_rejections_180d": payload.get(
                        "affiliate_payout_rejections_180d", 0
                    ),
                    "chargebacks_365d": payload.get("chargebacks_365d", 0),
                    "policy_flags_180d": payload.get("policy_flags_180d", 0),
                    "device_count_30d": payload.get("device_count_30d", 1),
                },
            )
            return {
                "success": True,
                "decision_bundle": {
                    "bundle_type": normalized_bundle_type,
                    "reward_decision": reward_decision["reward_decision"],
                    "fraud_decision": fraud_decision["fraud_decision"],
                },
            }

        if normalized_bundle_type == "payment_preflight":
            payment_preflight = self.payment_preflight_decision_service.decide(**payload)
            fraud_decision = self.fraud_decision_service.decide(
                flow_type="payment",
                account_id=payload["account_id"],
                ip=payload["ip"],
                headers=payload["headers"],
                payment_payload={
                    "order_id": payload["order_id"],
                    "amount": payload["amount"],
                    "currency": payload["currency"],
                    "failed_payments_24h": payload.get("failed_payments_24h", 0),
                    "attempts_last_1h": payload.get("attempts_last_1h", 0),
                    "distinct_cards_last_24h": payload.get("distinct_cards_last_24h", 0),
                    "distinct_accounts_from_ip_24h": payload.get(
                        "distinct_accounts_from_ip_24h", 0
                    ),
                    "recent_ip_events": payload.get("recent_ip_events", []),
                },
                account_profile={
                    "account_age_days": payload.get("account_age_days", 0),
                    "email_verified": payload.get("email_verified", False),
                    "phone_verified": payload.get("phone_verified", False),
                    "completed_orders": payload.get("completed_orders", 0),
                    "successful_watches_30d": payload.get("successful_watches_30d", 0),
                    "denied_watches_30d": payload.get("denied_watches_30d", 0),
                    "affiliate_payout_rejections_180d": payload.get(
                        "affiliate_payout_rejections_180d", 0
                    ),
                    "chargebacks_365d": payload.get("chargebacks_365d", 0),
                    "policy_flags_180d": payload.get("policy_flags_180d", 0),
                    "device_count_30d": payload.get("device_count_30d", 1),
                },
            )
            return {
                "success": True,
                "decision_bundle": {
                    "bundle_type": normalized_bundle_type,
                    "payment_preflight": payment_preflight["payment_preflight"],
                    "fraud_decision": fraud_decision["fraud_decision"],
                },
            }

        if normalized_bundle_type == "story_promotion":
            creator_promotion_risk = await self.creator_promotion_risk_service.evaluate(
                **payload
            )
            story_quote_signal = await self.story_quote_signal_service.evaluate(
                title=payload["title"],
                content=payload["content"],
                creator_profile=payload["creator_profile"],
                prompt=payload.get("prompt"),
                language=payload.get("language"),
                tags=payload.get("tags"),
                target_channel=payload["target_channel"],
                comparison_contents=payload.get("comparison_contents"),
                market_context=payload.get("market_context"),
            )
            return {
                "success": True,
                "decision_bundle": {
                    "bundle_type": normalized_bundle_type,
                    "creator_promotion_risk": creator_promotion_risk["creator_promotion_risk"],
                    "story_quote_signal": story_quote_signal["story_quote_signal"],
                },
            }

        raise ValueError("Unsupported bundle_type")

    def _normalize_bundle_type(self, value: str) -> str:
        normalized = str(value).strip().lower()
        allowed = {"watch_reward", "payment_preflight", "story_promotion"}
        if normalized not in allowed:
            raise ValueError(
                "bundle_type must be one of: watch_reward, payment_preflight, story_promotion"
            )
        return normalized
