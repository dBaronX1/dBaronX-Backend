from __future__ import annotations

from typing import Any

from app.services.final_enforcement_sweep_service import (
    FinalEnforcementSweepService,
)
from app.services.final_fastapi_subsystem_closure_service import (
    FinalFastapiSubsystemClosureService,
)
from app.services.nestjs_handshake_service import NestjsHandshakeService


class FastapiHandoffPackService:
    """
    Final handoff pack from FastAPI to downstream control and frontend surfaces.
    """

    def __init__(
        self,
        *,
        final_enforcement_sweep_service: FinalEnforcementSweepService | None = None,
        final_fastapi_subsystem_closure_service: FinalFastapiSubsystemClosureService | None = None,
        nestjs_handshake_service: NestjsHandshakeService | None = None,
    ) -> None:
        self.final_enforcement_sweep_service = (
            final_enforcement_sweep_service or FinalEnforcementSweepService()
        )
        self.final_fastapi_subsystem_closure_service = (
            final_fastapi_subsystem_closure_service
            or FinalFastapiSubsystemClosureService()
        )
        self.nestjs_handshake_service = (
            nestjs_handshake_service or NestjsHandshakeService()
        )

    def build(self) -> dict[str, Any]:
        enforcement = self.final_enforcement_sweep_service.build()[
            "final_enforcement_sweep"
        ]
        closure = self.final_fastapi_subsystem_closure_service.build()[
            "final_fastapi_subsystem_closure"
        ]
        handshake = self.nestjs_handshake_service.build()["nestjs_handshake"]

        return {
            "success": True,
            "fastapi_handoff_pack": {
                "closed": closure["closed"],
                "next_subsystem": closure["next_subsystem"],
                "handshake": handshake,
                "enforcement": {
                    "closed": enforcement["closed"],
                    "blockers": enforcement["blockers"],
                },
                "recommended_consumers": [
                    "telegram_bot",
                    "frontend_watch_to_earn",
                    "frontend_affiliate",
                    "frontend_ai_stories",
                    "frontend_ecommerce",
                ],
            },
        }
