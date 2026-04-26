from __future__ import annotations

from typing import Any

from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)


class RouteCoverageAuditService:
    """
    Audits route distribution across core economic subsystems.

    This is not a liveness check. It evaluates whether route coverage exists
    for the most important business engines.
    """

    def __init__(
        self,
        *,
        route_registry_service: SystemRouteRegistryService | None = None,
    ) -> None:
        self.route_registry_service = (
            route_registry_service or SystemRouteRegistryService()
        )

    def build(self) -> dict[str, Any]:
        registry = self.route_registry_service.build()["route_registry"]
        groups = registry.get("groups", {})

        coverage = {
            "watch_to_earn": len(groups.get("watch_to_earn", [])),
            "affiliate": len(groups.get("affiliate", [])),
            "payments": len(groups.get("payments", [])),
            "cross_subsystem_fraud": len(groups.get("cross_subsystem_fraud", [])),
            "ai_stories": len(groups.get("ai_stories", [])),
            "identity_and_reputation": len(groups.get("identity_and_reputation", [])),
        }

        missing = [
            domain
            for domain, count in coverage.items()
            if count == 0
        ]

        return {
            "success": True,
            "route_coverage_audit": {
                "coverage": coverage,
                "missing_domains": missing,
                "complete": len(missing) == 0,
            },
        }
