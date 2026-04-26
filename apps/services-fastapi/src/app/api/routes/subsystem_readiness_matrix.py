from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.subsystem_readiness_matrix import (
    SubsystemReadinessMatrixResponse,
)
from app.services.subsystem_readiness_matrix_service import (
    SubsystemReadinessMatrixService,
)

router = APIRouter(
    prefix="/subsystem-readiness-matrix",
    tags=["subsystem-readiness-matrix"],
)


def subsystem_readiness_matrix_service_dep() -> SubsystemReadinessMatrixService:
    return SubsystemReadinessMatrixService()


@router.get("/snapshot", response_model=SubsystemReadinessMatrixResponse)
async def get_subsystem_readiness_matrix_snapshot(
    service: SubsystemReadinessMatrixService = Depends(
        subsystem_readiness_matrix_service_dep
    ),
):
    result = service.build()
    return SubsystemReadinessMatrixResponse(**result)
