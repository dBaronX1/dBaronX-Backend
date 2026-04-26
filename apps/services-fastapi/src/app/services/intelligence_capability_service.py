from __future__ import annotations

from typing import Any

from app.services.decision_contract_catalog_service import (
    DecisionContractCatalogService,
)
from app.services.system_decision_manifest_service import (
    SystemDecisionManifestService,
)
from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)


class IntelligenceCapabilityService:
    """
    Canonical capability summary for the FastAPI intelligence layer.

    Intended for:
    - NestJS capability negotiation
    - deployment verification
    - ops and admin visibility
    """

    def __init__(
        self,
        *,
        manifest_service: SystemDecisionManifestService | None = None,
        route_registry_service: SystemRouteRegistryService | None = None,
        contract_catalog_service: DecisionContractCatalogService | None = None,
    ) -> None:
        self.manifest_service = manifest_service or SystemDecisionManifestService()
        self.route_registry_service = (
            route_registry_service or SystemRouteRegistryService()
        )
        self.contract_catalog_service = (
            contract_catalog_service or DecisionContractCatalogService()
        )

    def build(self) -> dict[str, Any]:
        manifest = self.manifest_service.build()["manifest"]
        registry = self.route_registry_service.build()["route_registry"]
        contracts = self.contract_catalog_service.build()["contract_catalog"]

        categories = {
            "watch_to_earn_intelligence": [
                "/watch-session-anomaly/evaluate",
                "/telemetry-integrity/watch/evaluate",
                "/w2e-reward-decision/decide",
            ],
            "affiliate_intelligence": [
                "/affiliate-velocity/evaluate",
                "/affiliate-payout-risk/evaluate",
            ],
            "payment_intelligence": [
                "/payment-telemetry/evaluate",
                "/payment-preflight-decision/decide",
            ],
            "ai_story_growth_intelligence": [
                "/story-promotion-eligibility/evaluate",
                "/story-quote-signal/evaluate",
                "/creator-promotion-risk/evaluate",
                "/story-campaign-brief/build",
            ],
            "cross_subsystem_intelligence": [
                "/fraud-decision/decide",
                "/decision-bundle/build",
                "/decision-trace/build",
            ],
        }

        return {
            "success": True,
            "capabilities": {
                "version": "1.0.0",
                "decision_surface_count": len(manifest.get("decision_surfaces", [])),
                "route_count": registry.get("total_routes", 0),
                "contract_groups": list(contracts.get("contracts", {}).keys()),
                "categories": categories,
            },
        }
