from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.final_enforcement_sweep import FinalEnforcementSweepResponse
from app.services.final_enforcement_sweep_service import (
    FinalEnforcementSweepService,
)

router = APIRouter(
    prefix="/final-enforcement-sweep",
    tags=["final-enforcement-sweep"],
)


def final_enforcement_sweep_service_dep() -> FinalEnforcementSweepService:
    return FinalEnforcementSweepService()


@router.get("/snapshot", response_model=FinalEnforcementSweepResponse)
async def get_final_enforcement_sweep_snapshot(
    service: FinalEnforcementSweepService = Depends(
        final_enforcement_sweep_service_dep
    ),
):
    result = service.build()
    return FinalEnforcementSweepResponse(**result)
