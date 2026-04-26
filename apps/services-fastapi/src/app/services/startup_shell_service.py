from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.final_operational_closure_service import (
    FinalOperationalClosureService,
)
from app.services.intelligence_startup_gate_service import (
    IntelligenceStartupGateService,
)
from app.services.runtime_dependency_manifest_service import (
    RuntimeDependencyManifestService,
)


class StartupShellService:
    """
    Canonical runtime-safe startup shell summary.

    This service exists to support:
    - application bootstrap logs
    - deployment startup hooks
    - structured startup visibility for NestJS and ops
    """

    def __init__(
        self,
        *,
        intelligence_startup_gate_service: IntelligenceStartupGateService | None = None,
        runtime_dependency_manifest_service: RuntimeDependencyManifestService | None = None,
        final_operational_closure_service: FinalOperationalClosureService | None = None,
    ) -> None:
        self.intelligence_startup_gate_service = (
            intelligence_startup_gate_service or IntelligenceStartupGateService()
        )
        self.runtime_dependency_manifest_service = (
            runtime_dependency_manifest_service or RuntimeDependencyManifestService()
        )
        self.final_operational_closure_service = (
            final_operational_closure_service or FinalOperationalClosureService()
        )

    def build(self) -> dict[str, Any]:
        startup_gate = self.intelligence_startup_gate_service.build()[
            "intelligence_startup_gate"
        ]
        runtime_dependencies = self.runtime_dependency_manifest_service.build()[
            "runtime_dependency_manifest"
        ]
        final_closure = self.final_operational_closure_service.build()[
            "final_operational_closure"
        ]

        ready = (
            startup_gate["startup_allowed"] is True
            and runtime_dependencies["launch_dependencies_ready"] is True
            and final_closure["closed"] is True
        )

        return {
            "success": True,
            "startup_shell": {
                "ready": ready,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "startup_gate_status": startup_gate["status"],
                "runtime_dependencies_ready": runtime_dependencies[
                    "launch_dependencies_ready"
                ],
                "final_operational_closure": final_closure["closed"],
                "blockers": sorted(
                    set(
                        list(startup_gate["blockers"])
                        + list(final_closure["blockers"])
                        + (
                            []
                            if runtime_dependencies["launch_dependencies_ready"]
                            else ["runtime_dependencies_not_ready"]
                        )
                    )
                ),
            },
        }
