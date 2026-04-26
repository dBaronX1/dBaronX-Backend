from __future__ import annotations

from typing import Any


class InternalEndpointGuardManifestService:
    """
    Canonical manifest describing which endpoint families must be protected by
    internal-access enforcement.
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
            "internal_operational_surfaces": [
                "/nestjs-handshake",
                "/runtime-dependency-manifest",
                "/intelligence-startup-gate",
                "/startup-sequence-manifest",
                "/launch-operation-manifest",
            ],
            "public_or_optionally_internal_surfaces": [
                "/system-decision-manifest",
                "/system-route-registry",
                "/decision-policy-registry",
                "/decision-contract-catalog",
                "/intelligence-capability",
                "/intelligence-health",
                "/operational-readiness",
                "/expected-router-registry",
                "/api-router-audit",
                "/economic-surface-coverage",
                "/subsystem-readiness-matrix",
            ],
        }

        return {
            "success": True,
            "internal_endpoint_guard_manifest": {
                "version": "1.0.0",
                "guarded_prefixes": guarded_prefixes,
            },
        }
