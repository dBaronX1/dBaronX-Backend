from __future__ import annotations

from typing import Any

from app.services.intelligence_health_service import IntelligenceHealthService
from app.services.internal_route_protection_audit_service import (
    InternalRouteProtectionAuditService,
)
from app.services.runtime_dependency_manifest_service import (
    RuntimeDependencyManifestService,
)
from app.services.subsystem_contract_compatibility_service import (
    SubsystemContractCompatibilityService,
)
from app.services.subsystem_readiness_matrix_service import (
    SubsystemReadinessMatrixService,
)


class LaunchReadinessScoreService:
    """
    Canonical weighted launch-readiness score.

    Converts multiple readiness and compatibility manifests into a single score
    usable for:
    - deployment gating
    - admin/ops dashboards
    - rollout confidence evaluation
    """

    def __init__(
        self,
        *,
        intelligence_health_service: IntelligenceHealthService | None = None,
        runtime_dependency_manifest_service: RuntimeDependencyManifestService | None = None,
        subsystem_readiness_matrix_service: SubsystemReadinessMatrixService | None = None,
        subsystem_contract_compatibility_service: SubsystemContractCompatibilityService | None = None,
        internal_route_protection_audit_service: InternalRouteProtectionAuditService | None = None,
    ) -> None:
        self.intelligence_health_service = (
            intelligence_health_service or IntelligenceHealthService()
        )
        self.runtime_dependency_manifest_service = (
            runtime_dependency_manifest_service or RuntimeDependencyManifestService()
        )
        self.subsystem_readiness_matrix_service = (
            subsystem_readiness_matrix_service or SubsystemReadinessMatrixService()
        )
        self.subsystem_contract_compatibility_service = (
            subsystem_contract_compatibility_service
            or SubsystemContractCompatibilityService()
        )
        self.internal_route_protection_audit_service = (
            internal_route_protection_audit_service
            or InternalRouteProtectionAuditService()
        )

    def build(self) -> dict[str, Any]:
        intelligence_health = self.intelligence_health_service.build()[
            "intelligence_health"
        ]
        runtime = self.runtime_dependency_manifest_service.build()[
            "runtime_dependency_manifest"
        ]
        subsystem_matrix = self.subsystem_readiness_matrix_service.build()[
            "subsystem_readiness_matrix"
        ]
        compatibility = self.subsystem_contract_compatibility_service.build()[
            "subsystem_contract_compatibility"
        ]
        protection = self.internal_route_protection_audit_service.build()[
            "internal_route_protection_audit"
        ]

        score = 0.0
        components: dict[str, float] = {}

        components["intelligence_health"] = (
            25.0 if intelligence_health["status"] == "ready" else 8.0
        )
        components["runtime_dependencies"] = (
            20.0 if runtime["launch_dependencies_ready"] else 6.0
        )
        components["subsystem_matrix"] = (
            25.0
            * (
                subsystem_matrix["ready_subsystems"]
                / max(1, subsystem_matrix["total_subsystems"])
            )
        )
        components["contract_compatibility"] = (
            20.0 if compatibility["compatible"] else 6.0
        )
        components["internal_route_protection"] = (
            10.0 if protection["complete"] else 3.0
        )

        score = round(sum(components.values()), 2)

        if score >= 92:
            band = "elite_ready"
        elif score >= 78:
            band = "strong_ready"
        elif score >= 60:
            band = "degraded"
        else:
            band = "not_ready"

        return {
            "success": True,
            "launch_readiness_score": {
                "score": score,
                "band": band,
                "components": components,
            },
        }
