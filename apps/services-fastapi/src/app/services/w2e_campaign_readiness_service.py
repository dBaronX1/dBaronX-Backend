from __future__ import annotations

from typing import Any

from app.services.decision_contract_catalog_service import (
    DecisionContractCatalogService,
)
from app.services.decision_policy_registry_service import (
    DecisionPolicyRegistryService,
)
from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)


class W2ECampaignReadinessService:
    """
    Canonical watch-to-earn campaign readiness audit.

    This checks whether the FastAPI side has enough intelligence surfaces
    for NestJS to safely operate:
    - telemetry validation
    - reward decisioning
    - fraud decision support
    """

    REQUIRED_PATHS = {
        "/watch-session-anomaly/evaluate",
        "/telemetry-integrity/watch/evaluate",
        "/w2e-reward-decision/decide",
        "/fraud-decision/decide",
        "/decision-trace/build",
    }

    def __init__(
        self,
        *,
        route_registry_service: SystemRouteRegistryService | None = None,
        contract_catalog_service: DecisionContractCatalogService | None = None,
        policy_registry_service: DecisionPolicyRegistryService | None = None,
    ) -> None:
        self.route_registry_service = (
            route_registry_service or SystemRouteRegistryService()
        )
        self.contract_catalog_service = (
            contract_catalog_service or DecisionContractCatalogService()
        )
        self.policy_registry_service = (
            policy_registry_service or DecisionPolicyRegistryService()
        )

    def build(self) -> dict[str, Any]:
        registry = self.route_registry_service.build()["route_registry"]
        contracts = self.contract_catalog_service.build()["contract_catalog"]["contracts"]
        policies = self.policy_registry_service.build()["policies"]

        present_paths = self._all_paths(registry)
        missing_paths = sorted(
            [path for path in self.REQUIRED_PATHS if path not in present_paths]
        )

        has_watch_contracts = bool(contracts.get("watch_to_earn"))
        has_cross_subsystem_contracts = bool(contracts.get("cross_subsystem"))
        has_watch_policy = bool(policies.get("watch_to_earn"))
        has_cross_policy = bool(policies.get("cross_subsystem"))

        reasons: list[str] = []
        if missing_paths:
            reasons.append("missing_required_w2e_routes")
        if not has_watch_contracts:
            reasons.append("missing_watch_contracts")
        if not has_cross_subsystem_contracts:
            reasons.append("missing_cross_subsystem_contracts")
        if not has_watch_policy:
            reasons.append("missing_watch_policy")
        if not has_cross_policy:
            reasons.append("missing_cross_subsystem_policy")

        ready = (
            len(missing_paths) == 0
            and has_watch_contracts
            and has_cross_subsystem_contracts
            and has_watch_policy
            and has_cross_policy
        )

        return {
            "success": True,
            "w2e_campaign_readiness": {
                "ready": ready,
                "required_path_count": len(self.REQUIRED_PATHS),
                "missing_paths": missing_paths,
                "contract_support": {
                    "watch_to_earn": has_watch_contracts,
                    "cross_subsystem": has_cross_subsystem_contracts,
                },
                "policy_support": {
                    "watch_to_earn": has_watch_policy,
                    "cross_subsystem": has_cross_policy,
                },
                "reasons": reasons,
            },
        }

    def _all_paths(self, registry: dict[str, Any]) -> set[str]:
        groups = registry.get("groups", {})
        paths: set[str] = set()
        for entries in groups.values():
            for entry in entries:
                path = entry.get("path")
                if path:
                    paths.add(str(path))
        return paths
