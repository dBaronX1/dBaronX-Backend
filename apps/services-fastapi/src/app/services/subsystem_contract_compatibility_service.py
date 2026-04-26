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


class SubsystemContractCompatibilityService:
    """
    Canonical compatibility audit between:
    - exposed routes
    - published contracts
    - policy registry

    This helps prevent a class of production failures where a route exists
    but its supporting contract/policy surface is missing.
    """

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
        routes = self.route_registry_service.build()["route_registry"]["groups"]
        contracts = self.contract_catalog_service.build()["contract_catalog"]["contracts"]
        policies = self.policy_registry_service.build()["policies"]

        subsystems = {
            "watch_to_earn": {
                "route_groups": ["watch_to_earn"],
                "contract_group": "watch_to_earn",
                "policy_group": "watch_to_earn",
            },
            "affiliate": {
                "route_groups": ["affiliate"],
                "contract_group": "affiliate",
                "policy_group": "affiliate",
            },
            "payments": {
                "route_groups": ["payments"],
                "contract_group": "payments",
                "policy_group": "payments",
            },
            "ai_stories": {
                "route_groups": ["ai_stories"],
                "contract_group": "ai_stories",
                "policy_group": "ai_stories",
            },
            "cross_subsystem": {
                "route_groups": ["cross_subsystem_fraud"],
                "contract_group": "cross_subsystem",
                "policy_group": "cross_subsystem",
            },
        }

        matrix: dict[str, Any] = {}
        issues: list[dict[str, str]] = []

        for name, spec in subsystems.items():
            route_count = sum(len(routes.get(group, [])) for group in spec["route_groups"])
            has_contract_group = bool(contracts.get(spec["contract_group"]))
            has_policy_group = bool(policies.get(spec["policy_group"]))

            compatible = route_count > 0 and has_contract_group and has_policy_group
            matrix[name] = {
                "compatible": compatible,
                "route_count": route_count,
                "has_contract_group": has_contract_group,
                "has_policy_group": has_policy_group,
            }

            if route_count == 0:
                issues.append(
                    {
                        "subsystem": name,
                        "issue": "missing_routes",
                    }
                )
            if not has_contract_group:
                issues.append(
                    {
                        "subsystem": name,
                        "issue": "missing_contract_group",
                    }
                )
            if not has_policy_group:
                issues.append(
                    {
                        "subsystem": name,
                        "issue": "missing_policy_group",
                    }
                )

        return {
            "success": True,
            "subsystem_contract_compatibility": {
                "compatible": len(issues) == 0,
                "matrix": matrix,
                "issues": issues,
            },
        }
