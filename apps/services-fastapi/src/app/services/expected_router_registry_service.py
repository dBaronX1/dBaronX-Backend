from __future__ import annotations

from typing import Any


class ExpectedRouterRegistryService:
    """
    Canonical expected-router registry for the FastAPI intelligence layer.

    This exists so router inclusion can be audited deterministically without
    scraping source files from external tooling.
    """

    def build(self) -> dict[str, Any]:
        router_prefixes = [
            "/account-trust-profile",
            "/affiliate-campaign-readiness",
            "/affiliate-payout-risk",
            "/affiliate-velocity",
            "/api-router-audit",
            "/creator-promotion-risk",
            "/decision-bundle",
            "/decision-bundle-manifest",
            "/decision-consistency",
            "/decision-contract-catalog",
            "/decision-policy-registry",
            "/decision-trace",
            "/device-fingerprint",
            "/economic-surface-coverage",
            "/fraud-decision",
            "/intelligence-bootstrap-manifest",
            "/intelligence-capability",
            "/intelligence-health",
            "/intelligence-startup-gate",
            "/internal-access-contract",
            "/ip-reputation",
            "/launch-operation-manifest",
            "/nestjs-handshake",
            "/operational-readiness",
            "/payment-intelligence-readiness",
            "/payment-preflight-decision",
            "/payment-telemetry",
            "/request-audit-envelope",
            "/route-coverage-audit",
            "/runtime-dependency-manifest",
            "/startup-sequence-manifest",
            "/story-ad-copy",
            "/story-campaign-brief",
            "/story-card-payload",
            "/story-promotion-eligibility",
            "/story-promotion-readiness",
            "/story-quote-signal",
            "/story-watch-teaser",
            "/subsystem-contract-compatibility",
            "/subsystem-readiness-matrix",
            "/system-decision-manifest",
            "/system-route-registry",
            "/telegram-operational-manifest",
            "/telemetry-integrity",
            "/w2e-campaign-readiness",
            "/w2e-reward-decision",
            "/watch-session-anomaly",
        ]

        return {
            "success": True,
            "expected_router_registry": {
                "version": "1.0.0",
                "expected_router_prefixes": router_prefixes,
                "expected_count": len(router_prefixes),
            },
        }
