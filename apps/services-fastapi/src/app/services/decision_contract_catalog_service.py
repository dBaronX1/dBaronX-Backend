from __future__ import annotations

from typing import Any


class DecisionContractCatalogService:
    """
    Canonical decision contract catalog.

    This file is the stable machine-readable contract map for all major
    FastAPI intelligence responses consumed by NestJS, Telegram, admin tools,
    and future frontend/internal observability surfaces.
    """

    def build(self) -> dict[str, Any]:
        contracts = {
            "watch_to_earn": {
                "telemetry_integrity": {
                    "response_key": "integrity",
                    "required_fields": [
                        "allow",
                        "decision",
                        "composite_risk_score",
                        "fingerprint",
                        "ip_reputation",
                        "session_anomaly",
                    ],
                },
                "reward_decision": {
                    "response_key": "reward_decision",
                    "required_fields": [
                        "allow",
                        "decision",
                        "decision_score",
                        "telemetry",
                        "trust",
                        "reasons",
                    ],
                },
            },
            "affiliate": {
                "velocity": {
                    "response_key": "affiliate_velocity",
                    "required_fields": [
                        "affiliate_user_id",
                        "risk_score",
                        "risk_level",
                        "allow",
                        "signals",
                        "reasons",
                    ],
                },
                "payout_risk": {
                    "response_key": "affiliate_payout_risk",
                    "required_fields": [
                        "account_id",
                        "payout_method",
                        "risk_score",
                        "decision",
                        "allow",
                        "trust",
                        "velocity",
                        "ip_reputation",
                        "reasons",
                    ],
                },
            },
            "payments": {
                "telemetry": {
                    "response_key": "payment_telemetry",
                    "required_fields": [
                        "order_id",
                        "currency",
                        "risk_score",
                        "decision",
                        "allow",
                        "fingerprint",
                        "ip_reputation",
                        "signals",
                        "reasons",
                    ],
                },
                "preflight": {
                    "response_key": "payment_preflight",
                    "required_fields": [
                        "allow",
                        "decision",
                        "decision_score",
                        "telemetry",
                        "trust",
                        "reasons",
                    ],
                },
            },
            "ai_stories": {
                "promotion_eligibility": {
                    "response_key": "story_promotion_eligibility",
                    "required_fields": [
                        "eligible",
                        "target_channel",
                        "channel_fit_score",
                        "publication",
                        "creator",
                        "campaign_fit",
                        "reasons",
                    ],
                },
                "quote_signal": {
                    "response_key": "story_quote_signal",
                    "required_fields": [
                        "eligible",
                        "target_channel",
                        "channel_fit_score",
                        "creator_trust_band",
                        "quote_multiplier",
                        "manual_review_required",
                        "reasons",
                    ],
                },
                "creator_promotion_risk": {
                    "response_key": "creator_promotion_risk",
                    "required_fields": [
                        "creator_account_id",
                        "decision",
                        "allow",
                        "risk_score",
                        "trust",
                        "eligibility",
                        "reasons",
                    ],
                },
            },
            "cross_subsystem": {
                "fraud_decision": {
                    "response_key": "fraud_decision",
                    "required_fields": [
                        "flow_type",
                        "account_id",
                        "allow",
                        "decision",
                        "decision_score",
                        "signals",
                        "reasons",
                    ],
                },
                "decision_bundle": {
                    "response_key": "decision_bundle",
                    "required_fields": [
                        "bundle_type",
                    ],
                },
                "decision_trace": {
                    "response_key": "decision_trace",
                    "required_fields": [
                        "flow_type",
                        "trace_hash",
                        "generated_at",
                        "request_payload",
                        "decision_payload",
                        "metadata",
                    ],
                },
            },
        }

        return {
            "success": True,
            "contract_catalog": {
                "version": "1.0.0",
                "contracts": contracts,
            },
        }
