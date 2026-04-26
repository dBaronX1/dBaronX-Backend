from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.deployment_checklist_service import DeploymentChecklistService
from app.services.final_operational_closure_service import (
    FinalOperationalClosureService,
)
from app.services.launch_readiness_score_service import (
    LaunchReadinessScoreService,
)
from app.services.public_runtime_summary_service import (
    PublicRuntimeSummaryService,
)
from app.services.runtime_dependency_manifest_service import (
    RuntimeDependencyManifestService,
)


class RootHealthService:
    """
    Canonical full health surface.

    This is the main public-safe health response for infrastructure, admin
    tooling, and inter-service diagnostics.
    """

    def __init__(
        self,
        *,
        public_runtime_summary_service: PublicRuntimeSummaryService | None = None,
        runtime_dependency_manifest_service: RuntimeDependencyManifestService | None = None,
        launch_readiness_score_service: LaunchReadinessScoreService | None = None,
        deployment_checklist_service: DeploymentChecklistService | None = None,
        final_operational_closure_service: FinalOperationalClosureService | None = None,
    ) -> None:
        self.public_runtime_summary_service = (
            public_runtime_summary_service or PublicRuntimeSummaryService()
        )
        self.runtime_dependency_manifest_service = (
            runtime_dependency_manifest_service or RuntimeDependencyManifestService()
        )
        self.launch_readiness_score_service = (
            launch_readiness_score_service or LaunchReadinessScoreService()
        )
        self.deployment_checklist_service = (
            deployment_checklist_service or DeploymentChecklistService()
        )
        self.final_operational_closure_service = (
            final_operational_closure_service or FinalOperationalClosureService()
        )

    def build(self) -> dict[str, Any]:
        runtime_summary = self.public_runtime_summary_service.build()[
            "public_runtime_summary"
        ]
        runtime_dependencies = self.runtime_dependency_manifest_service.build()[
            "runtime_dependency_manifest"
        ]
        launch_score = self.launch_readiness_score_service.build()[
            "launch_readiness_score"
        ]
        deployment_checklist = self.deployment_checklist_service.build()[
            "deployment_checklist"
        ]
        final_closure = self.final_operational_closure_service.build()[
            "final_operational_closure"
        ]

        status = "ready"
        if runtime_summary["status"] != "ready" or not deployment_checklist["deploy_allowed"]:
            status = "degraded"
        if final_closure["closed"] is not True:
            status = "not_ready"

        return {
            "success": True,
            "health": {
                "service": "dbaronx-fastapi-intelligence",
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "summary": runtime_summary,
                "runtime_dependencies_ready": runtime_dependencies[
                    "launch_dependencies_ready"
                ],
                "launch_score": launch_score,
                "deployment_checklist": deployment_checklist,
                "final_operational_closure": {
                    "closed": final_closure["closed"],
                    "blocker_count": len(final_closure["blockers"]),
                },
            },
        }
