from __future__ import annotations

from typing import Any

from app.services.final_fastapi_subsystem_closure_service import (
    FinalFastapiSubsystemClosureService,
)
from app.services.fastapi_handoff_pack_service import FastapiHandoffPackService


class FastapiPhaseClosureService:
    """
    Canonical phase-closure service for FastAPI.
    """

    def __init__(
        self,
        *,
        final_fastapi_subsystem_closure_service: FinalFastapiSubsystemClosureService | None = None,
        fastapi_handoff_pack_service: FastapiHandoffPackService | None = None,
    ) -> None:
        self.final_fastapi_subsystem_closure_service = (
            final_fastapi_subsystem_closure_service
            or FinalFastapiSubsystemClosureService()
        )
        self.fastapi_handoff_pack_service = (
            fastapi_handoff_pack_service or FastapiHandoffPackService()
        )

    def build(self) -> dict[str, Any]:
        closure = self.final_fastapi_subsystem_closure_service.build()[
            "final_fastapi_subsystem_closure"
        ]
        handoff = self.fastapi_handoff_pack_service.build()["fastapi_handoff_pack"]

        return {
            "success": True,
            "fastapi_phase_closure": {
                "current_phase_closed": closure["closed"],
                "blockers": closure["blockers"],
                "next_subsystem": handoff["next_subsystem"],
                "recommended_consumers": handoff["recommended_consumers"],
            },
        }
