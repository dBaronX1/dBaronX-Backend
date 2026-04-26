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


class RootReadinessService:
    """
    Canonical readiness surface.

    Unlike liveness, readiness verifies whether this service is actually fit
    to participate in the dBaronX launch-operational ecosystem.
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

        blockers: list[str] = []
        if startup_gate["startup_allowed"] is not True:
            blockers.extend(startup_gate["blockers"])
        if runtime_dependencies["launch_dependencies_ready"] is not True:
            blockers.append("runtime_dependencies_not_ready")
        if final_closure["closed"] is not True:
            blockers.extend(final_closure["blockers"])

        return {
            "success": True,
            "readiness": {
                "ready": ready,
                "service": "dbaronx-fastapi-intelligence",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "blockers": blockers,
            },
        }
