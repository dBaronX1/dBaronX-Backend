from __future__ import annotations

from typing import Any

from app.services.decision_policy_registry_service import (
    DecisionPolicyRegistryService,
)
from app.services.system_decision_manifest_service import (
    SystemDecisionManifestService,
)
from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)


class OperationalReadinessService:
    """
    Canonical operational readiness snapshot.

    Purpose:
    - expose whether the FastAPI intelligence layer has enough decision surfaces
      to support the dBaronX ecosystem
    - provide stable machine-readable readiness checks for deployment/ops
    """

    def __init__(
        self,
        *,
        system_decision_manifest_service: SystemDecisionManifestService | None = None,
        decision_policy_registry_service: DecisionPolicyRegistryService | None = None,
        system_route_registry_service: SystemRouteRegistryService | None = None,
    ) -> None:
        self.system_decision_manifest_service = (
            system_decision_manifest_service or SystemDecisionManifestService()
        )
        self.decision_policy_registry_service = (
            decision_policy_registry_service or DecisionPolicyRegistryService()
        )
        self.system_route_registry_service = (
            system_route_registry_service or SystemRouteRegistryService()
        )

    def build(self) -> dict[str, Any]:
        manifest = self.system_decision_manifest_service.build()["manifest"]
        policies = self.decision_policy_registry_service.build()["policies"]
        route_registry = self.system_route_registry_service.build()["route_registry"]

        checks = {
            "decision_manifest_present": bool(manifest.get("decision_surfaces")),
            "policy_registry_present": bool(policies),
            "route_registry_present": bool(route_registry.get("groups")),
            "critical_watch_surface_present": self._has_route(
                route_registry,
                "/w2e-reward-decision/decide",
            ),
            "critical_payment_surface_present": self._has_route(
                route_registry,
                "/payment-preflight-decision/decide",
            ),
            "critical_affiliate_surface_present": self._has_route(
                route_registry,
                "/affiliate-payout-risk/evaluate",
            ),
            "critical_story_surface_present": self._has_route(
                route_registry,
                "/story-promotion-eligibility/evaluate",
            ),
        }

        passed = all(checks.values())
        status = "ready" if passed else "degraded"

        coverage = {
            "decision_surface_count": len(manifest.get("decision_surfaces", [])),
            "route_group_count": int(route_registry.get("group_count", 0)),
            "route_count": int(route_registry.get("total_routes", 0)),
            "policy_group_count": len(policies.keys()),
        }

        return {
            "success": True,
            "operational_readiness": {
                "status": status,
                "passed": passed,
                "checks": checks,
                "coverage": coverage,
            },
        }

    def _has_route(self, route_registry: dict[str, Any], path: str) -> bool:
        groups = route_registry.get("groups", {})
        for entries in groups.values():
            for entry in entries:
                if entry.get("path") == path:
                    return True
        return False
