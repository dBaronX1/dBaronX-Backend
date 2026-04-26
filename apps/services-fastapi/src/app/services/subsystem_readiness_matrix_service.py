from __future__ import annotations

from typing import Any

from app.services.decision_policy_registry_service import (
    DecisionPolicyRegistryService,
)
from app.services.intelligence_capability_service import (
    IntelligenceCapabilityService,
)
from app.services.operational_readiness_service import (
    OperationalReadinessService,
)
from app.services.route_coverage_audit_service import (
    RouteCoverageAuditService,
)


class SubsystemReadinessMatrixService:
    """
    Canonical subsystem readiness matrix for the FastAPI intelligence layer.

    Purpose:
    - expose whether critical decision coverage exists for each dBaronX business engine
    - support deployment gating from NestJS/ops pipelines
    - provide stable subsystem-level readiness rather than only route-level presence
    """

    def __init__(
        self,
        *,
        operational_readiness_service: OperationalReadinessService | None = None,
        route_coverage_audit_service: RouteCoverageAuditService | None = None,
        decision_policy_registry_service: DecisionPolicyRegistryService | None = None,
        intelligence_capability_service: IntelligenceCapabilityService | None = None,
    ) -> None:
        self.operational_readiness_service = (
            operational_readiness_service or OperationalReadinessService()
        )
        self.route_coverage_audit_service = (
            route_coverage_audit_service or RouteCoverageAuditService()
        )
        self.decision_policy_registry_service = (
            decision_policy_registry_service or DecisionPolicyRegistryService()
        )
        self.intelligence_capability_service = (
            intelligence_capability_service or IntelligenceCapabilityService()
        )

    def build(self) -> dict[str, Any]:
        ops = self.operational_readiness_service.build()["operational_readiness"]
        route_coverage = self.route_coverage_audit_service.build()["route_coverage_audit"]
        policy_registry = self.decision_policy_registry_service.build()["policies"]
        capability_summary = self.intelligence_capability_service.build()["capabilities"]

        coverage = route_coverage["coverage"]

        matrix = {
            "watch_to_earn": self._subsystem_state(
                route_count=coverage.get("watch_to_earn", 0),
                has_policy=bool(policy_registry.get("watch_to_earn")),
                ops_ready=bool(ops["checks"].get("critical_watch_surface_present")),
            ),
            "affiliate": self._subsystem_state(
                route_count=coverage.get("affiliate", 0),
                has_policy=bool(policy_registry.get("affiliate")),
                ops_ready=bool(ops["checks"].get("critical_affiliate_surface_present")),
            ),
            "payments": self._subsystem_state(
                route_count=coverage.get("payments", 0),
                has_policy=bool(policy_registry.get("payments")),
                ops_ready=bool(ops["checks"].get("critical_payment_surface_present")),
            ),
            "ai_stories": self._subsystem_state(
                route_count=coverage.get("ai_stories", 0),
                has_policy=bool(policy_registry.get("ai_stories")),
                ops_ready=bool(ops["checks"].get("critical_story_surface_present")),
            ),
            "cross_subsystem_fraud": self._subsystem_state(
                route_count=coverage.get("cross_subsystem_fraud", 0),
                has_policy=bool(policy_registry.get("cross_subsystem")),
                ops_ready=coverage.get("cross_subsystem_fraud", 0) > 0,
            ),
            "identity_and_reputation": self._subsystem_state(
                route_count=coverage.get("identity_and_reputation", 0),
                has_policy=True,
                ops_ready=coverage.get("identity_and_reputation", 0) > 0,
            ),
        }

        ready_count = len([item for item in matrix.values() if item["status"] == "ready"])

        return {
            "success": True,
            "subsystem_readiness_matrix": {
                "overall_status": "ready" if ops["passed"] else "degraded",
                "ready_subsystems": ready_count,
                "total_subsystems": len(matrix),
                "decision_surface_count": capability_summary["decision_surface_count"],
                "route_count": capability_summary["route_count"],
                "matrix": matrix,
            },
        }

    def _subsystem_state(
        self,
        *,
        route_count: int,
        has_policy: bool,
        ops_ready: bool,
    ) -> dict[str, Any]:
        status = "ready" if route_count > 0 and has_policy and ops_ready else "degraded"
        return {
            "status": status,
            "route_count": route_count,
            "has_policy": has_policy,
            "ops_ready": ops_ready,
        }
