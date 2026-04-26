from __future__ import annotations

from typing import Any


class SystemDecisionManifestService:
    """
    Canonical manifest for FastAPI decision surfaces.

    Gives the ecosystem a stable, introspectable contract layer so NestJS,
    Telegram, frontend, and operations tooling can discover which
    high-value decision endpoints are available without scraping code.
    """

    def build(self) -> dict[str, Any]:
        manifest = {
            "version": "1.0.0",
            "decision_surfaces": [
                {
                    "name": "telemetry_integrity_watch",
                    "route": "/telemetry-integrity/watch/evaluate",
                    "method": "POST",
                    "purpose": "Watch-to-earn telemetry integrity evaluation",
                },
                {
                    "name": "w2e_reward_decision",
                    "route": "/w2e-reward-decision/decide",
                    "method": "POST",
                    "purpose": "Final W2E reward allow/review/deny decision",
                },
                {
                    "name": "affiliate_velocity",
                    "route": "/affiliate-velocity/evaluate",
                    "method": "POST",
                    "purpose": "Affiliate traffic and payout behavior velocity scoring",
                },
                {
                    "name": "affiliate_payout_risk",
                    "route": "/affiliate-payout-risk/evaluate",
                    "method": "POST",
                    "purpose": "Affiliate payout release risk evaluation",
                },
                {
                    "name": "payment_telemetry",
                    "route": "/payment-telemetry/evaluate",
                    "method": "POST",
                    "purpose": "Payment telemetry risk scoring",
                },
                {
                    "name": "payment_preflight_decision",
                    "route": "/payment-preflight-decision/decide",
                    "method": "POST",
                    "purpose": "Payment initiation allow/review/deny decision",
                },
                {
                    "name": "fraud_decision",
                    "route": "/fraud-decision/decide",
                    "method": "POST",
                    "purpose": "Cross-subsystem fraud decision surface",
                },
                {
                    "name": "story_promotion_eligibility",
                    "route": "/story-promotion-eligibility/evaluate",
                    "method": "POST",
                    "purpose": "Story campaign promotion eligibility",
                },
                {
                    "name": "story_quote_signal",
                    "route": "/story-quote-signal/evaluate",
                    "method": "POST",
                    "purpose": "Story promotion quote multiplier signal",
                },
                {
                    "name": "story_campaign_brief",
                    "route": "/story-campaign-brief/build",
                    "method": "POST",
                    "purpose": "Story campaign creative and channel brief",
                },
            ],
        }

        return {
            "success": True,
            "manifest": manifest,
        }
