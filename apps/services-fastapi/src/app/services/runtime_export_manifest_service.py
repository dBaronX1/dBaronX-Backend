from __future__ import annotations

from typing import Any

from app.services.internal_access_contract_service import (
    InternalAccessContractService,
)
from app.services.intelligence_capability_service import (
    IntelligenceCapabilityService,
)
from app.services.launch_operation_manifest_service import (
    LaunchOperationManifestService,
)
from app.services.runtime_dependency_manifest_service import (
    RuntimeDependencyManifestService,
)


class RuntimeExportManifestService:
    """
    Canonical runtime export manifest.

    Designed for persistence-ready operational export to:
    - NestJS admin/ops storage
    - deployment checks
    - launch runbooks
    - periodic state snapshots
    """

    def __init__(
        self,
        *,
        launch_operation_manifest_service: LaunchOperationManifestService | None = None,
        runtime_dependency_manifest_service: RuntimeDependencyManifestService | None = None,
        internal_access_contract_service: InternalAccessContractService | None = None,
        intelligence_capability_service: IntelligenceCapabilityService | None = None,
    ) -> None:
        self.launch_operation_manifest_service = (
            launch_operation_manifest_service or LaunchOperationManifestService()
        )
        self.runtime_dependency_manifest_service = (
            runtime_dependency_manifest_service or RuntimeDependencyManifestService()
        )
        self.internal_access_contract_service = (
            internal_access_contract_service or InternalAccessContractService()
        )
        self.intelligence_capability_service = (
            intelligence_capability_service or IntelligenceCapabilityService()
        )

    def build(self) -> dict[str, Any]:
        launch = self.launch_operation_manifest_service.build()[
            "launch_operation_manifest"
        ]
        runtime = self.runtime_dependency_manifest_service.build()[
            "runtime_dependency_manifest"
        ]
        access = self.internal_access_contract_service.build()[
            "internal_access_contract"
        ]
        capabilities = self.intelligence_capability_service.build()["capabilities"]

        export_payload = {
            "launch_ready": launch["launch_ready"],
            "launch_blockers": launch["blockers"],
            "runtime_dependencies_ready": runtime["launch_dependencies_ready"],
            "internal_access_mode": access["auth_mode"],
            "decision_surface_count": capabilities["decision_surface_count"],
            "route_count": capabilities["route_count"],
            "contract_groups": capabilities["contract_groups"],
        }

        return {
            "success": True,
            "runtime_export_manifest": {
                "version": "1.0.0",
                "export_payload": export_payload,
            },
        }
