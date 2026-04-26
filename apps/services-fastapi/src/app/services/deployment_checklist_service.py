from __future__ import annotations

from typing import Any

from app.services.intelligence_startup_gate_service import (
    IntelligenceStartupGateService,
)
from app.services.launch_readiness_score_service import (
    LaunchReadinessScoreService,
)
from app.services.runtime_dependency_manifest_service import (
    RuntimeDependencyManifestService,
)
from app.services.subsystem_contract_compatibility_service import (
    SubsystemContractCompatibilityService,
)


class DeploymentChecklistService:
    """
    Canonical deployment checklist snapshot.

    This converts technical readiness into explicit deploy/no-deploy checks.
    """

    def __init__(
        self,
        *,
        intelligence_startup_gate_service: IntelligenceStartupGateService | None = None,
        runtime_dependency_manifest_service: RuntimeDependencyManifestService | None = None,
        subsystem_contract_compatibility_service: SubsystemContractCompatibilityService | None = None,
        launch_readiness_score_service: LaunchReadinessScoreService | None = None,
    ) -> None:
        self.intelligence_startup_gate_service = (
            intelligence_startup_gate_service or IntelligenceStartupGateService()
        )
        self.runtime_dependency_manifest_service = (
            runtime_dependency_manifest_service or RuntimeDependencyManifestService()
        )
        self.subsystem_contract_compatibility_service = (
            subsystem_contract_compatibility_service
            or SubsystemContractCompatibilityService()
        )
        self.launch_readiness_score_service = (
            launch_readiness_score_service or LaunchReadinessScoreService()
        )

    def build(self) -> dict[str, Any]:
        startup_gate = self.intelligence_startup_gate_service.build()[
            "intelligence_startup_gate"
        ]
        runtime = self.runtime_dependency_manifest_service.build()[
            "runtime_dependency_manifest"
        ]
        compatibility = self.subsystem_contract_compatibility_service.build()[
            "subsystem_contract_compatibility"
        ]
        score = self.launch_readiness_score_service.build()["launch_readiness_score"]

        checks = {
            "startup_gate_passed": startup_gate["startup_allowed"],
            "runtime_dependencies_ready": runtime["launch_dependencies_ready"],
            "contracts_compatible": compatibility["compatible"],
            "launch_score_minimum_met": score["score"] >= 78.0,
        }

        failing_checks = [name for name, value in checks.items() if value is not True]

        return {
            "success": True,
            "deployment_checklist": {
                "deploy_allowed": len(failing_checks) == 0,
                "checks": checks,
                "failing_checks": failing_checks,
                "launch_score": score["score"],
                "launch_band": score["band"],
            },
        }
