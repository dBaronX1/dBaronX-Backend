from __future__ import annotations

from typing import Any


class InternalEndpointGuardManifestService:
    """
    Canonical manifest describing endpoint families that require internal-access
    enforcement. Public compatibility snapshot routes remain intentionally
    callable by NestJS/Fly smoke probes and are not listed as guarded.
    """

    def build(self) -> dict[str, Any]:
        guarded_prefixes = {
            "critical_decisions": [
                "/fraud-decision",
                "/w2e-reward-decision",
                "/payment-preflight-decision",
                "/affiliate-payout-risk",
                "/creator-promotion-risk",
                "/decision-bundle",
                "/decision-trace",
                "/request-audit-envelope",
            ],
            "internal_exports": [
                "/runtime-export-manifest",
            ],
        }

        public_compatibility_prefixes = [
            "/health",
            "/nestjs-handshake",
            "/launch-control-manifest",
            "/intelligence-startup-gate",
            "/runtime-snapshot",
            "/fastapi-step1-closure",
        ]

        return {
            "success": True,
            "internal_endpoint_guard_manifest": {
                "version": "1.0.0",
                "guarded_prefixes": guarded_prefixes,
                "public_compatibility_prefixes": public_compatibility_prefixes,
            },
        }
