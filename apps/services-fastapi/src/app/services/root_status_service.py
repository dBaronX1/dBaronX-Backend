from __future__ import annotations

from typing import Any

from app.services.public_runtime_summary_service import (
    PublicRuntimeSummaryService,
)
from app.services.runtime_snapshot_service import RuntimeSnapshotService


class RootStatusService:
    """
    Canonical root/status payload service.

    This is the safest top-level summary for humans and infrastructure:
    - low bandwidth
    - no sensitive config leakage
    - enough signal to know if FastAPI is fit for the ecosystem
    """

    def __init__(
        self,
        *,
        public_runtime_summary_service: PublicRuntimeSummaryService | None = None,
        runtime_snapshot_service: RuntimeSnapshotService | None = None,
    ) -> None:
        self.public_runtime_summary_service = (
            public_runtime_summary_service or PublicRuntimeSummaryService()
        )
        self.runtime_snapshot_service = (
            runtime_snapshot_service or RuntimeSnapshotService()
        )

    def build(self) -> dict[str, Any]:
        public_summary = self.public_runtime_summary_service.build()[
            "public_runtime_summary"
        ]
        runtime_snapshot = self.runtime_snapshot_service.build()["runtime_snapshot"]

        return {
            "success": True,
            "service": "dbaronx-fastapi-intelligence",
            "status": public_summary["status"],
            "launch_ready": public_summary["launch_ready"],
            "launch_band": runtime_snapshot["launch_band"],
            "decision_surface_count": public_summary["decision_surface_count"],
            "route_count": public_summary["route_count"],
            "ready_subsystems": public_summary["ready_subsystems"],
            "total_subsystems": public_summary["total_subsystems"],
            "blocker_count": public_summary["blocker_count"],
        }
