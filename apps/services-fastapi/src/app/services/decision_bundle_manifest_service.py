from __future__ import annotations

from typing import Any


class DecisionBundleManifestService:
    """
    Canonical manifest for supported decision bundles.

    Useful for:
    - NestJS orchestration planning
    - Telegram/admin tooling
    - operational compatibility checks
    """

    def build(self) -> dict[str, Any]:
        bundles = {
            "watch_reward": {
                "required_payload_fields": [
                    "session_id",
                    "account_id",
                    "headers",
                    "ip",
                    "declared_duration_seconds",
                    "heartbeat_intervals_ms",
                    "total_heartbeats",
                ],
                "returns": [
                    "reward_decision",
                    "fraud_decision",
                ],
            },
            "payment_preflight": {
                "required_payload_fields": [
                    "order_id",
                    "account_id",
                    "ip",
                    "headers",
                    "amount",
                    "currency",
                ],
                "returns": [
                    "payment_preflight",
                    "fraud_decision",
                ],
            },
            "story_promotion": {
                "required_payload_fields": [
                    "creator_account_id",
                    "title",
                    "content",
                    "creator_profile",
                    "target_channel",
                    "proposed_spend_amount",
                ],
                "returns": [
                    "creator_promotion_risk",
                    "story_quote_signal",
                ],
            },
        }

        return {
            "success": True,
            "decision_bundle_manifest": {
                "version": "1.0.0",
                "bundle_count": len(bundles),
                "bundles": bundles,
            },
        }
