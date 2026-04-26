from __future__ import annotations

from typing import Any

from app.services.economic_surface_coverage_service import (
    EconomicSurfaceCoverageService,
)
from app.services.intelligence_capability_service import (
    IntelligenceCapabilityService,
)
from app.services.operational_readiness_service import (
    OperationalReadinessService,
)
from app.services.subsystem_readiness_matrix_service import (
    SubsystemReadinessMatrixService,
)


class IntelligenceHealthService:
    """
    Canonical top-level health summary for the FastAPI intelligence layer.

    This is not an HTTP liveness probe replacement.
    It measures whether the intelligence subsystem is operationally complete
    enough to support the economic brain.

    Primary consumers:
    - NestJS startup/runtime compatibility checks
    - deployment pipelines
    - ops dashboards
    - Telegram/admin diagnostics
    """

    def __init__(
        self,
        *,
        operational_readiness_service: OperationalReadinessService | None = None,
        subsystem_readiness_matrix_service: SubsystemReadinessMatrixService | None = None,
        economic_surface_coverage_service: EconomicSurfaceCoverageService | None = None,
        intelligence_capability_service: IntelligenceCapabilityService | None = None,
    ) -> None:
        self.operational_readiness_service = (
            operational_readiness_service or OperationalReadinessService()
        )
        self.subsystem_readiness_matrix_service = (
            subsystem_readiness_matrix_service or SubsystemReadinessMatrixService()
        )
        self.economic_surface_coverage_service = (
            economic_surface_coverage_service or EconomicSurfaceCoverageService()
        )
        self.intelligence_capability_service = (
            intelligence_capability_service or IntelligenceCapabilityService()
        )

    def build(self) -> dict[str, Any]:
        ops = self.operational_readiness_service.build()["operational_readiness"]
        subsystem_matrix = self.subsystem_readiness_matrix_service.build()[
            "subsystem_readiness_matrix"
        ]
        economic_coverage = self.economic_surface_coverage_service.build()[
            "economic_surface_coverage"
        ]
        capabilities = self.intelligence_capability_service.build()["capabilities"]

        blockers: list[str] = []

        if ops["passed"] is not True:
            blockers.append("operational_readiness_not_passed")

        if subsystem_matrix["overall_status"] != "ready":
            blockers.append("subsystem_matrix_not_ready")

        if economic_coverage["status"] != "ready":
            blockers.append("economic_surface_coverage_not_ready")

        if capabilities["decision_surface_count"] < 10:
            blockers.append("insufficient_decision_surface_count")

        if capabilities["route_count"] < 20:
            blockers.append("insufficient_route_count")

        overall_status = "ready" if not blockers else "degraded"

        return {
            "success": True,
            "intelligence_health": {
                "status": overall_status,
                "blockers": blockers,
                "summary": {
                    "decision_surface_count": capabilities["decision_surface_count"],
                    "route_count": capabilities["route_count"],
                    "ready_subsystems": subsystem_matrix["ready_subsystems"],
                    "total_subsystems": subsystem_matrix["total_subsystems"],
                },
                "sources": {
                    "operational_readiness": ops,
                    "subsystem_readiness_matrix": subsystem_matrix,
                    "economic_surface_coverage": economic_coverage,
                    "capabilities": capabilities,
                },
            },
        }
