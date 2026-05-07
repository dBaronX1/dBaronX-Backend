from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.routes.snapshot_contract import (
    compat_snapshot,
    degraded_snapshot,
    exception_blocker,
)

from app.schemas.intelligence_startup_gate import (
    IntelligenceStartupGateResponse,
)
from app.services.intelligence_startup_gate_service import (
    IntelligenceStartupGateService,
)

router = APIRouter(
    prefix="/intelligence-startup-gate",
    tags=["intelligence-startup-gate"],
)


def intelligence_startup_gate_service_dep() -> IntelligenceStartupGateService:
    return IntelligenceStartupGateService()


@router.get("/snapshot", response_model=IntelligenceStartupGateResponse)
async def get_intelligence_startup_gate_snapshot(
    service: IntelligenceStartupGateService = Depends(
        intelligence_startup_gate_service_dep
    ),
):
    try:
        result = service.build()
    except Exception as exc:
        return degraded_snapshot(
            "intelligence_startup_gate",
            exception_blocker("intelligence_startup_gate", exc),
        )

    return compat_snapshot("intelligence_startup_gate", result)
