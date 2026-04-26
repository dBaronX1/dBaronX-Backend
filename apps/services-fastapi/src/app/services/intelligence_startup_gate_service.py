from __future__ import annotations

from typing import Any

from app.services.intelligence_bootstrap_manifest_service import (
    IntelligenceBootstrapManifestService,
)
from app.services.subsystem_contract_compatibility_service import (
    SubsystemContractCompatibilityService,
)


class IntelligenceStartupGateService:
    """
    Canonical startup gate for the FastAPI intelligence layer.

    Used by:
    - deployment pipelines
    - NestJS compatibility checks
    - operational startup verification

    It provides a stricter launch gate than generic health.
    """

    def __init__(
        self,
        *,
        intelligence_bootstrap_manifest_service: IntelligenceBootstrapManifestService | None = None,
        subsystem_contract_compatibility_service: SubsystemContractCompatibilityService | None = None,
    ) -> None:
        self.intelligence_bootstrap_manifest_service = (
            intelligence_bootstrap_manifest_service
            or IntelligenceBootstrapManifestService()
        )
        self.subsystem_contract_compatibility_service = (
            subsystem_contract_compatibility_service
            or SubsystemContractCompatibilityService()
        )

    def build(self) -> dict[str, Any]:
        bootstrap = self.intelligence_bootstrap_manifest_service.build()[
            "intelligence_bootstrap_manifest"
        ]
        compatibility = self.subsystem_contract_compatibility_service.build()[
            "subsystem_contract_compatibility"
        ]

        blockers: list[str] = []

        if bootstrap["bootstrap_ready"] is not True:
            blockers.append("bootstrap_manifest_not_ready")

        if compatibility["compatible"] is not True:
            blockers.append("subsystem_contract_incompatibility")

        startup_allowed = len(blockers) == 0

        return {
            "success": True,
            "intelligence_startup_gate": {
                "startup_allowed": startup_allowed,
                "status": "pass" if startup_allowed else "fail",
                "blockers": blockers,
                "bootstrap_manifest": bootstrap,
                "compatibility": compatibility,
            },
        }
