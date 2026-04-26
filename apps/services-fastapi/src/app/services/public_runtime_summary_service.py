from __future__ import annotations

from typing import Any

from app.services.intelligence_capability_service import (
    IntelligenceCapabilityService,
)
from app.services.intelligence_health_service import IntelligenceHealthService
from app.services.launch_operation_manifest_service import (
    LaunchOperationManifestService,
)


class PublicRuntimeSummaryService:
    """
    Canonical public-safe operational summary.

    Exposes only high-level, non-sensitive launch and capability signals for:
    - dashboards
    - uptime checks
    - manual ops validation
    - low-bandwidth frontend/admin status awareness
    """

    def __init__(
        self,
        *,
        intelligence_health_service: IntelligenceHealthService | None = None,
        intelligence_capability_service: IntelligenceCapabilityService | None = None,
        launch_operation_manifest_service: LaunchOperationManifestService | None = None,
    ) -> None:
        self.intelligence_health_service = (
            intelligence_health_service or IntelligenceHealthService()
        )
        self.intelligence_capability_service = (
            intelligence_capability_service or IntelligenceCapabilityService()
        )
        self.launch_operation_manifest_service = (
            launch_operation_manifest_service or LaunchOperationManifestService()
        )

    def build(self) -> dict[str, Any]:
        health = self.intelligence_health_service.build()["intelligence_health"]
        capabilities = self.intelligence_capability_service.build()["capabilities"]
        launch = self.launch_operation_manifest_service.build()[
            "launch_operation_manifest"
        ]

        return {
            "success": True,
            "public_runtime_summary": {
                "status": health["status"],
                "launch_ready": launch["launch_ready"],
                "decision_surface_count": capabilities["decision_surface_count"],
                "route_count": capabilities["route_count"],
                "ready_subsystems": launch["subsystem_ready_count"],
                "total_subsystems": launch["subsystem_total_count"],
                "blocker_count": len(launch["blockers"]),
            },
        }
