from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.bootstrap_runtime_guard_service import BootstrapRuntimeGuardService
    from app.services.fastapi_operational_closure_status_service import (
        FastapiOperationalClosureStatusService,
    )
    from app.services.launch_control_manifest_service import LaunchControlManifestService


class FastapiStep1ClosureService:
    """
    Final FastAPI Step 1 closure service.

    This is the handoff surface stating whether FastAPI shell/bootstrap/router
    enforcement is closed strongly enough to shift execution to NestJS.
    """

    def __init__(
        self,
        *,
        bootstrap_runtime_guard_service: "BootstrapRuntimeGuardService" | None = None,
        fastapi_operational_closure_status_service: "FastapiOperationalClosureStatusService" | None = None,
        launch_control_manifest_service: "LaunchControlManifestService" | None = None,
    ) -> None:
        self.bootstrap_runtime_guard_service = bootstrap_runtime_guard_service
        self.fastapi_operational_closure_status_service = (
            fastapi_operational_closure_status_service
        )
        self.launch_control_manifest_service = launch_control_manifest_service

    def build(self) -> dict[str, Any]:
        if self.bootstrap_runtime_guard_service is None:
            from app.services.bootstrap_runtime_guard_service import (
                BootstrapRuntimeGuardService,
            )

            self.bootstrap_runtime_guard_service = BootstrapRuntimeGuardService()

        if self.fastapi_operational_closure_status_service is None:
            from app.services.fastapi_operational_closure_status_service import (
                FastapiOperationalClosureStatusService,
            )

            self.fastapi_operational_closure_status_service = (
                FastapiOperationalClosureStatusService()
            )

        if self.launch_control_manifest_service is None:
            from app.services.launch_control_manifest_service import (
                LaunchControlManifestService,
            )

            self.launch_control_manifest_service = LaunchControlManifestService()

        bootstrap_guard = self.bootstrap_runtime_guard_service.build()[
            "bootstrap_runtime_guard"
        ]
        closure_status = self.fastapi_operational_closure_status_service.build()[
            "fastapi_operational_closure_status"
        ]
        launch_control = self.launch_control_manifest_service.build()[
            "launch_control_manifest"
        ]

        closed = (
            bootstrap_guard["guard_passed"] is True
            and closure_status["step_1_closed"] is True
        )

        return {
            "success": True,
            "fastapi_step1_closure": {
                "closed": closed,
                "ready_to_shift_to_nestjs": closed,
                "go_live_allowed": launch_control["go_live_allowed"],
                "blockers": sorted(
                    set(
                        list(bootstrap_guard["blockers"])
                        + list(closure_status["blockers"])
                        + list(launch_control["blockers"])
                    )
                ),
            },
        }
