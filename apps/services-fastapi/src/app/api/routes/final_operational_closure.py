from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.final_operational_closure import (
    FinalOperationalClosureResponse,
)
from app.services.final_operational_closure_service import (
    FinalOperationalClosureService,
)

router = APIRouter(
    prefix="/final-operational-closure",
    tags=["final-operational-closure"],
)


def final_operational_closure_service_dep() -> FinalOperationalClosureService:
    return FinalOperationalClosureService()


@router.get("/snapshot", response_model=FinalOperationalClosureResponse)
async def get_final_operational_closure_snapshot(
    service: FinalOperationalClosureService = Depends(
        final_operational_closure_service_dep
    ),
):
    result = service.build()
    return FinalOperationalClosureResponse(**result)
