from __future__ import annotations

from typing import Any

from app.services.decision_contract_catalog_service import (
    DecisionContractCatalogService,
)
from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)


class EconomicSurfaceCoverageService:
    """
    Canonical economic-surface coverage audit.

    Evaluates whether the FastAPI intelligence layer exposes enough surfaces
    to support the main monetization engines:
    - watch-to-earn
    - affiliate
    - payments
    - AI stories promotion
    """

    REQUIRED_ROUTE_PATHS = {
        "watch_to_earn": {
            "/telemetry-integrity/watch/evaluate",
            "/w2e-reward-decision/decide",
        },
        "affiliate": {
            "/affiliate-velocity/evaluate",
            "/affiliate-payout-risk/evaluate",
        },
        "payments": {
            "/payment-telemetry/evaluate",
            "/payment-preflight-decision/decide",
        },
        "ai_story_promotion": {
            "/story-promotion-eligibility/evaluate",
            "/story-quote-signal/evaluate",
            "/creator-promotion-risk/evaluate",
        },
    }

    def __init__(
        self,
        *,
        route_registry_service: SystemRouteRegistryService | None = None,
        decision_contract_catalog_service: DecisionContractCatalogService | None = None,
    ) -> None:
        self.route_registry_service = (
            route_registry_service or SystemRouteRegistryService()
        )
        self.decision_contract_catalog_service = (
            decision_contract_catalog_service or DecisionContractCatalogService()
        )

    def build(self) -> dict[str, Any]:
        route_registry = self.route_registry_service.build()["route_registry"]
        contract_catalog = self.decision_contract_catalog_service.build()["contract_catalog"]

        paths = self._all_paths(route_registry)
        contracts = contract_catalog.get("contracts", {})

        surfaces: dict[str, Any] = {}
        for surface_name, required_paths in self.REQUIRED_ROUTE_PATHS.items():
            present_paths = sorted([path for path in required_paths if path in paths])
            missing_paths = sorted([path for path in required_paths if path not in paths])
            surfaces[surface_name] = {
                "status": "ready" if not missing_paths else "degraded",
                "required_count": len(required_paths),
                "present_count": len(present_paths),
                "present_paths": present_paths,
                "missing_paths": missing_paths,
            }

        contract_presence = {
            "watch_to_earn_contracts": bool(contracts.get("watch_to_earn")),
            "affiliate_contracts": bool(contracts.get("affiliate")),
            "payments_contracts": bool(contracts.get("payments")),
            "ai_stories_contracts": bool(contracts.get("ai_stories")),
            "cross_subsystem_contracts": bool(contracts.get("cross_subsystem")),
        }

        overall_ready = (
            all(item["status"] == "ready" for item in surfaces.values())
            and all(contract_presence.values())
        )

        return {
            "success": True,
            "economic_surface_coverage": {
                "status": "ready" if overall_ready else "degraded",
                "contract_presence": contract_presence,
                "surfaces": surfaces,
            },
        }

    def _all_paths(self, route_registry: dict[str, Any]) -> set[str]:
        groups = route_registry.get("groups", {})
        paths: set[str] = set()
        for entries in groups.values():
            for entry in entries:
                path = entry.get("path")
                if path:
                    paths.add(str(path))
        return paths
