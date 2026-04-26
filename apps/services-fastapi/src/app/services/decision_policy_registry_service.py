from __future__ import annotations

from typing import Any


class DecisionPolicyRegistryService:
    """
    Canonical registry of thresholds and operational rules exposed by FastAPI.

    Gives NestJS and operations tooling a stable introspection contract for:
    - W2E reward gating
    - affiliate payout review thresholds
    - payment preflight review/deny thresholds
    - AI Stories promotion quality thresholds
    """

    def build(self) -> dict[str, Any]:
        policies = {
            "watch_to_earn": {
                "telemetry_integrity": {
                    "allow_below_score": 48.0,
                    "review_from_score": 48.0,
                    "deny_from_score": 70.0,
                },
                "reward_decision": {
                    "allow_below_score": 42.0,
                    "review_from_score": 42.0,
                    "deny_from_score": 68.0,
                },
            },
            "affiliate": {
                "velocity": {
                    "allow_below_score": 45.0,
                    "review_from_score": 45.0,
                    "deny_from_score": 65.0,
                },
                "payout_risk": {
                    "allow_below_score": 44.0,
                    "review_from_score": 44.0,
                    "deny_from_score": 72.0,
                },
            },
            "payments": {
                "preflight": {
                    "allow_below_score": 43.0,
                    "review_from_score": 43.0,
                    "deny_from_score": 70.0,
                },
                "telemetry": {
                    "allow_decision": "allow",
                    "review_decision": "review",
                    "deny_decision": "deny",
                },
            },
            "ai_stories": {
                "promotion_eligibility": {
                    "minimum_quality_score": 64,
                    "minimum_discovery_channel_fit": 62,
                    "minimum_affiliate_channel_fit": 66,
                    "minimum_watch_channel_fit": 72,
                    "minimum_featured_channel_fit": 80,
                },
            },
            "cross_subsystem": {
                "fraud_decision": {
                    "allow_below_score": 44.0,
                    "review_from_score": 44.0,
                    "deny_from_score": 72.0,
                },
            },
        }

        return {
            "success": True,
            "policies": policies,
        }
