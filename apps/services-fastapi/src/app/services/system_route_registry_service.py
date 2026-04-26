from __future__ import annotations

from typing import Any


class SystemRouteRegistryService:
    """
    Canonical route registry for FastAPI high-value subsystem surfaces.

    This is intentionally explicit and human-readable so:
    - NestJS can introspect available intelligence endpoints
    - frontend/admin tooling can map capabilities safely
    - operational scripts can verify route coverage without parsing code
    """

    def build(self) -> dict[str, Any]:
        groups = {
            "system": [
                {
                    "name": "system_decision_manifest",
                    "method": "GET",
                    "path": "/system-decision-manifest/index",
                    "criticality": "high",
                },
                {
                    "name": "decision_policy_registry",
                    "method": "GET",
                    "path": "/decision-policy-registry/index",
                    "criticality": "high",
                },
            ],
            "watch_to_earn": [
                {
                    "name": "watch_session_anomaly",
                    "method": "POST",
                    "path": "/watch-session-anomaly/evaluate",
                    "criticality": "high",
                },
                {
                    "name": "telemetry_integrity_watch",
                    "method": "POST",
                    "path": "/telemetry-integrity/watch/evaluate",
                    "criticality": "critical",
                },
                {
                    "name": "w2e_reward_decision",
                    "method": "POST",
                    "path": "/w2e-reward-decision/decide",
                    "criticality": "critical",
                },
            ],
            "affiliate": [
                {
                    "name": "affiliate_velocity",
                    "method": "POST",
                    "path": "/affiliate-velocity/evaluate",
                    "criticality": "high",
                },
                {
                    "name": "affiliate_payout_risk",
                    "method": "POST",
                    "path": "/affiliate-payout-risk/evaluate",
                    "criticality": "critical",
                },
            ],
            "payments": [
                {
                    "name": "payment_telemetry",
                    "method": "POST",
                    "path": "/payment-telemetry/evaluate",
                    "criticality": "high",
                },
                {
                    "name": "payment_preflight_decision",
                    "method": "POST",
                    "path": "/payment-preflight-decision/decide",
                    "criticality": "critical",
                },
            ],
            "cross_subsystem_fraud": [
                {
                    "name": "fraud_decision",
                    "method": "POST",
                    "path": "/fraud-decision/decide",
                    "criticality": "critical",
                },
                {
                    "name": "decision_trace",
                    "method": "POST",
                    "path": "/decision-trace/build",
                    "criticality": "high",
                },
            ],
            "ai_stories": [
                {
                    "name": "story_promotion_eligibility",
                    "method": "POST",
                    "path": "/story-promotion-eligibility/evaluate",
                    "criticality": "critical",
                },
                {
                    "name": "story_quote_signal",
                    "method": "POST",
                    "path": "/story-quote-signal/evaluate",
                    "criticality": "high",
                },
                {
                    "name": "creator_promotion_risk",
                    "method": "POST",
                    "path": "/creator-promotion-risk/evaluate",
                    "criticality": "critical",
                },
                {
                    "name": "story_campaign_brief",
                    "method": "POST",
                    "path": "/story-campaign-brief/build",
                    "criticality": "high",
                },
                {
                    "name": "story_campaign_fit",
                    "method": "POST",
                    "path": "/story-campaign-fit/evaluate",
                    "criticality": "high",
                },
                {
                    "name": "story_market_position",
                    "method": "POST",
                    "path": "/story-market-position/evaluate",
                    "criticality": "high",
                },
            ],
            "identity_and_reputation": [
                {
                    "name": "device_fingerprint",
                    "method": "POST",
                    "path": "/device-fingerprint/build",
                    "criticality": "high",
                },
                {
                    "name": "ip_reputation",
                    "method": "POST",
                    "path": "/ip-reputation/assess",
                    "criticality": "high",
                },
                {
                    "name": "account_trust_profile",
                    "method": "POST",
                    "path": "/account-trust-profile/evaluate",
                    "criticality": "high",
                },
            ],
        }

        total_routes = sum(len(items) for items in groups.values())

        return {
            "success": True,
            "route_registry": {
                "version": "1.0.0",
                "group_count": len(groups),
                "total_routes": total_routes,
                "groups": groups,
            },
        }
