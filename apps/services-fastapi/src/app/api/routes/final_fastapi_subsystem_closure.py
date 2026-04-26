from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.final_fastapi_subsystem_closure import (
    FinalFastapiSubsystemClosureResponse,
)
from app.services.final_fastapi_subsystem_closure_service import (
    FinalFastapiSubsystemClosureService,
)

router = APIRouter(
    prefix="/final-fastapi-subsystem-closure",
    tags=["final-fastapi-subsystem-closure"],
)


def final_fastapi_subsystem_closure_service_dep() -> (
    FinalFastapiSubsystemClosureService
):
    return FinalFastapiSubsystemClosureService()


@router.get("/snapshot", response_model=FinalFastapiSubsystemClosureResponse)
async def get_final_fastapi_subsystem_closure_snapshot(
    service: FinalFastapiSubsystemClosureService = Depends(
        final_fastapi_subsystem_closure_service_dep
    ),
):
    result = service.build()
    return FinalFastapiSubsystemClosureResponse(**result)
