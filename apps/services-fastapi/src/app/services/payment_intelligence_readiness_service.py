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


class PaymentIntelligenceReadinessService:
    """
    Canonical payment-intelligence readiness audit.

    Validates whether the FastAPI layer is sufficiently prepared to support:
    - payment initiation screening
    - payment fraud escalation
    - review/deny workflows
    - trace-safe audit trails
    """

    REQUIRED_PATHS = {
        "/payment-telemetry/evaluate",
        "/payment-preflight-decision/decide",
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

        has_payment_contracts = bool(contracts.get("payments"))
        has_cross_contracts = bool(contracts.get("cross_subsystem"))
        has_payment_policy = bool(policies.get("payments"))
        has_cross_policy = bool(policies.get("cross_subsystem"))

        reasons: list[str] = []
        if missing_paths:
            reasons.append("missing_required_payment_routes")
        if not has_payment_contracts:
            reasons.append("missing_payments_contracts")
        if not has_cross_contracts:
            reasons.append("missing_cross_subsystem_contracts")
        if not has_payment_policy:
            reasons.append("missing_payments_policy")
        if not has_cross_policy:
            reasons.append("missing_cross_subsystem_policy")

        ready = (
            len(missing_paths) == 0
            and has_payment_contracts
            and has_cross_contracts
            and has_payment_policy
            and has_cross_policy
        )

        return {
            "success": True,
            "payment_intelligence_readiness": {
                "ready": ready,
                "required_path_count": len(self.REQUIRED_PATHS),
                "missing_paths": missing_paths,
                "contract_support": {
                    "payments": has_payment_contracts,
                    "cross_subsystem": has_cross_contracts,
                },
                "policy_support": {
                    "payments": has_payment_policy,
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
