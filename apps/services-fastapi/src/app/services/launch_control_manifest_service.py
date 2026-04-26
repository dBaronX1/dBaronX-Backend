from __future__ import annotations

from typing import Any

from app.services.deployment_checklist_service import DeploymentChecklistService
from app.services.final_operational_closure_service import (
    FinalOperationalClosureService,
)
from app.services.launch_readiness_score_service import (
    LaunchReadinessScoreService,
)
from app.services.startup_sequence_manifest_service import (
    StartupSequenceManifestService,
)


class LaunchControlManifestService:
    """
    Canonical launch-control manifest.

    This is the operational control document for final go/no-go decisions.
    """

    def __init__(
        self,
        *,
        deployment_checklist_service: DeploymentChecklistService | None = None,
        final_operational_closure_service: FinalOperationalClosureService | None = None,
        launch_readiness_score_service: LaunchReadinessScoreService | None = None,
        startup_sequence_manifest_service: StartupSequenceManifestService | None = None,
    ) -> None:
        self.deployment_checklist_service = (
            deployment_checklist_service or DeploymentChecklistService()
        )
        self.final_operational_closure_service = (
            final_operational_closure_service or FinalOperationalClosureService()
        )
        self.launch_readiness_score_service = (
            launch_readiness_score_service or LaunchReadinessScoreService()
        )
        self.startup_sequence_manifest_service = (
            startup_sequence_manifest_service or StartupSequenceManifestService()
        )

    def build(self) -> dict[str, Any]:
        deployment = self.deployment_checklist_service.build()["deployment_checklist"]
        closure = self.final_operational_closure_service.build()[
            "final_operational_closure"
        ]
        launch_score = self.launch_readiness_score_service.build()[
            "launch_readiness_score"
        ]
        startup_sequence = self.startup_sequence_manifest_service.build()[
            "startup_sequence_manifest"
        ]

        go_live_allowed = (
            deployment["deploy_allowed"] is True
            and closure["closed"] is True
            and startup_sequence["launch_ready"] is True
            and launch_score["score"] >= 78.0
        )

        return {
            "success": True,
            "launch_control_manifest": {
                "go_live_allowed": go_live_allowed,
                "launch_band": launch_score["band"],
                "launch_score": launch_score["score"],
                "deployment_allowed": deployment["deploy_allowed"],
                "closure_closed": closure["closed"],
                "startup_sequence_ready": startup_sequence["launch_ready"],
                "blockers": sorted(
                    set(
                        list(deployment["failing_checks"])
                        + list(closure["blockers"])
                        + list(startup_sequence["blocking_steps"])
                    )
                ),
            },
        }
