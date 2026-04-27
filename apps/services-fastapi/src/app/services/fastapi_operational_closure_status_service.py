from __future__ import annotations

from typing import Any

from app.services.dependency_wiring_audit_service import (
    DependencyWiringAuditService,
)
from app.services.final_operational_closure_service import (
    FinalOperationalClosureService,
)
from app.services.launch_control_manifest_service import (
    LaunchControlManifestService,
)
from app.services.router_inclusion_closure_service import (
    RouterInclusionClosureService,
)


class FastapiOperationalClosureStatusService:
    """
    Canonical Step-1 closure status service.

    This is the final status surface for FastAPI canonical operational closure.
    It answers whether Step 1 is closed strongly enough to shift focus to
    NestJS canonical launch orchestration.
    """

    def __init__(
        self,
        *,
        router_inclusion_closure_service: RouterInclusionClosureService | None = None,
        dependency_wiring_audit_service: DependencyWiringAuditService | None = None,
        final_operational_closure_service: FinalOperationalClosureService | None = None,
        launch_control_manifest_service: LaunchControlManifestService | None = None,
    ) -> None:
        self.router_inclusion_closure_service = (
            router_inclusion_closure_service or RouterInclusionClosureService()
        )
        self.dependency_wiring_audit_service = (
            dependency_wiring_audit_service or DependencyWiringAuditService()
        )
        self.final_operational_closure_service = (
            final_operational_closure_service or FinalOperationalClosureService()
        )
        self.launch_control_manifest_service = (
            launch_control_manifest_service or LaunchControlManifestService()
        )

    def build(self) -> dict[str, Any]:
        router_closure = self.router_inclusion_closure_service.build()[
            "router_inclusion_closure"
        ]
        dependency_wiring = self.dependency_wiring_audit_service.build()[
            "dependency_wiring_audit"
        ]
        final_closure = self.final_operational_closure_service.build()[
            "final_operational_closure"
        ]
        launch_control = self.launch_control_manifest_service.build()[
            "launch_control_manifest"
        ]

        step_1_closed = (
            router_closure["closed"] is True
            and dependency_wiring["wired"] is True
            and final_closure["closed"] is True
        )

        next_focus = (
            "nestjs_canonical_launch_orchestration"
            if step_1_closed
            else "finish_fastapi_operational_closure"
        )

        return {
            "success": True,
            "fastapi_operational_closure_status": {
                "step_1_closed": step_1_closed,
                "next_focus": next_focus,
                "router_inclusion_closed": router_closure["closed"],
                "dependency_wiring_complete": dependency_wiring["wired"],
                "final_operational_closure_closed": final_closure["closed"],
                "go_live_allowed": launch_control["go_live_allowed"],
                "blockers": sorted(
                    set(
                        list(router_closure["missing_router_prefixes"])
                        + list(dependency_wiring["failing_checks"])
                        + list(final_closure["blockers"])
                        + list(launch_control["blockers"])
                    )
                ),
            },
        }
