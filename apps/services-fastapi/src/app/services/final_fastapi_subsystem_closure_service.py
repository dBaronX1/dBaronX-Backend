from __future__ import annotations

from typing import Any

from app.services.final_enforcement_sweep_service import (
    FinalEnforcementSweepService,
)
from app.services.fastapi_step1_closure_service import FastapiStep1ClosureService
from app.services.final_operational_closure_service import (
    FinalOperationalClosureService,
)


class FinalFastapiSubsystemClosureService:
    """
    Final closure surface for the FastAPI subsystem.

    This closes the FastAPI intelligence/risk/AI brain for the current build
    phase and defines the next system target after enforcement is complete.
    """

    def __init__(
        self,
        *,
        final_enforcement_sweep_service: FinalEnforcementSweepService | None = None,
        fastapi_step1_closure_service: FastapiStep1ClosureService | None = None,
        final_operational_closure_service: FinalOperationalClosureService | None = None,
    ) -> None:
        self.final_enforcement_sweep_service = (
            final_enforcement_sweep_service or FinalEnforcementSweepService()
        )
        self.fastapi_step1_closure_service = (
            fastapi_step1_closure_service or FastapiStep1ClosureService()
        )
        self.final_operational_closure_service = (
            final_operational_closure_service
            or FinalOperationalClosureService()
        )

    def build(self) -> dict[str, Any]:
        enforcement = self.final_enforcement_sweep_service.build()[
            "final_enforcement_sweep"
        ]
        step1 = self.fastapi_step1_closure_service.build()[
            "fastapi_step1_closure"
        ]
        operational = self.final_operational_closure_service.build()[
            "final_operational_closure"
        ]

        closed = (
            enforcement["closed"] is True
            and step1["closed"] is True
            and operational["closed"] is True
        )

        blockers = sorted(
            set(
                list(enforcement["blockers"])
                + list(step1["blockers"])
                + list(operational["blockers"])
            )
        )

        return {
            "success": True,
            "final_fastapi_subsystem_closure": {
                "closed": closed,
                "blockers": blockers,
                "step1_closed": step1["closed"],
                "operational_closure_closed": operational["closed"],
                "enforcement_sweep_closed": enforcement["closed"],
                "next_subsystem": "telegram_production_surface",
            },
        }
