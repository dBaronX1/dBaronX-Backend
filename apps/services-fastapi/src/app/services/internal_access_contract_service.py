from __future__ import annotations

from typing import Any


class InternalAccessContractService:
    """
    Canonical internal-access contract manifest.

    This gives NestJS, Telegram, and operational tooling one stable description
    of how intelligence endpoints are expected to be consumed internally.
    """

    def build(self) -> dict[str, Any]:
        contract = {
            "version": "1.0.0",
            "auth_mode": "internal_service_token",
            "required_header": "x-internal-token",
            "optional_headers": [
                "x-request-id",
                "x-caller-service",
                "x-caller-surface",
                "x-actor-id",
            ],
            "trust_model": {
                "public_read_only_manifests_allowed": True,
                "decision_endpoints_internal_only": True,
                "batch_orchestration_internal_only": True,
                "sensitive_trace_generation_internal_only": True,
            },
            "recommended_callers": {
                "nestjs": [
                    "/nestjs-handshake/snapshot",
                    "/intelligence-bootstrap-manifest/snapshot",
                    "/decision-bundle/build",
                    "/fraud-decision/decide",
                ],
                "telegram_bot": [
                    "/telegram-operational-manifest/snapshot",
                    "/intelligence-health/snapshot",
                    "/w2e-campaign-readiness/snapshot",
                    "/affiliate-campaign-readiness/snapshot",
                    "/story-promotion-readiness/snapshot",
                ],
                "ops_runtime": [
                    "/intelligence-startup-gate/snapshot",
                    "/operational-readiness/snapshot",
                    "/subsystem-contract-compatibility/snapshot",
                    "/economic-surface-coverage/snapshot",
                ],
            },
        }

        return {
            "success": True,
            "internal_access_contract": contract,
        }
