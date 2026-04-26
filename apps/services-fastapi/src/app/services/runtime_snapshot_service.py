from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.intelligence_health_service import IntelligenceHealthService
from app.services.launch_readiness_score_service import (
    LaunchReadinessScoreService,
)
from app.services.runtime_dependency_manifest_service import (
    RuntimeDependencyManifestService,
)


class RuntimeSnapshotService:
    """
    Canonical low-bandwidth runtime snapshot.

    This is the compact operational surface for:
    - status pages
    - deployment checks
    - startup sequence consumers
    - admin/runtime telemetry exports
    """

    def __init__(
        self,
        *,
        intelligence_health_service: IntelligenceHealthService | None = None,
        launch_readiness_score_service: LaunchReadinessScoreService | None = None,
        runtime_dependency_manifest_service: RuntimeDependencyManifestService | None = None,
    ) -> None:
        self.intelligence_health_service = (
            intelligence_health_service or IntelligenceHealthService()
        )
        self.launch_readiness_score_service = (
            launch_readiness_score_service or LaunchReadinessScoreService()
        )
        self.runtime_dependency_manifest_service = (
            runtime_dependency_manifest_service or RuntimeDependencyManifestService()
        )

    def build(self) -> dict[str, Any]:
        intelligence_health = self.intelligence_health_service.build()[
            "intelligence_health"
        ]
        launch_score = self.launch_readiness_score_service.build()[
            "launch_readiness_score"
        ]
        runtime_dependencies = self.runtime_dependency_manifest_service.build()[
            "runtime_dependency_manifest"
        ]

        return {
            "success": True,
            "runtime_snapshot": {
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "status": intelligence_health["status"],
                "launch_band": launch_score["band"],
                "launch_score": launch_score["score"],
                "runtime_dependencies_ready": runtime_dependencies[
                    "launch_dependencies_ready"
                ],
                "blocker_count": len(intelligence_health["blockers"]),
                "blockers": intelligence_health["blockers"],
            },
        }
