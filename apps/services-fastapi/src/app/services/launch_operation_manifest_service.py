from __future__ import annotations

from typing import Any

from app.services.intelligence_health_service import IntelligenceHealthService
from app.services.internal_access_contract_service import (
    InternalAccessContractService,
)
from app.services.startup_sequence_manifest_service import (
    StartupSequenceManifestService,
)
from app.services.subsystem_readiness_matrix_service import (
    SubsystemReadinessMatrixService,
)


class LaunchOperationManifestService:
    """
    Canonical launch-operation manifest.

    This is the operational closure surface for the FastAPI intelligence layer,
    aggregating startup sequence, subsystem readiness, and internal consumption
    contract into one launch-facing payload.
    """

    def __init__(
        self,
        *,
        intelligence_health_service: IntelligenceHealthService | None = None,
        subsystem_readiness_matrix_service: SubsystemReadinessMatrixService | None = None,
        startup_sequence_manifest_service: StartupSequenceManifestService | None = None,
        internal_access_contract_service: InternalAccessContractService | None = None,
    ) -> None:
        self.intelligence_health_service = (
            intelligence_health_service or IntelligenceHealthService()
        )
        self.subsystem_readiness_matrix_service = (
            subsystem_readiness_matrix_service or SubsystemReadinessMatrixService()
        )
        self.startup_sequence_manifest_service = (
            startup_sequence_manifest_service or StartupSequenceManifestService()
        )
        self.internal_access_contract_service = (
            internal_access_contract_service or InternalAccessContractService()
        )

    def build(self) -> dict[str, Any]:
        intelligence_health = self.intelligence_health_service.build()[
            "intelligence_health"
        ]
        subsystem_matrix = self.subsystem_readiness_matrix_service.build()[
            "subsystem_readiness_matrix"
        ]
        startup_sequence = self.startup_sequence_manifest_service.build()[
            "startup_sequence_manifest"
        ]
        internal_access_contract = self.internal_access_contract_service.build()[
            "internal_access_contract"
        ]

        launch_ready = (
            intelligence_health["status"] == "ready"
            and subsystem_matrix["overall_status"] == "ready"
            and startup_sequence["launch_ready"] is True
        )

        blockers: list[str] = []
        if intelligence_health["status"] != "ready":
            blockers.append("intelligence_health_degraded")
        if subsystem_matrix["overall_status"] != "ready":
            blockers.append("subsystem_matrix_degraded")
        if startup_sequence["launch_ready"] is not True:
            blockers.extend(startup_sequence["blocking_steps"])

        return {
            "success": True,
            "launch_operation_manifest": {
                "launch_ready": launch_ready,
                "blockers": blockers,
                "intelligence_health_status": intelligence_health["status"],
                "subsystem_ready_count": subsystem_matrix["ready_subsystems"],
                "subsystem_total_count": subsystem_matrix["total_subsystems"],
                "internal_access_mode": internal_access_contract["auth_mode"],
                "startup_sequence": startup_sequence,
            },
        }
