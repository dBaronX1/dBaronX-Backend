from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.internal_route_family_matrix import (
    InternalRouteFamilyMatrixResponse,
)
from app.services.internal_route_family_matrix_service import (
    InternalRouteFamilyMatrixService,
)

router = APIRouter(
    prefix="/internal-route-family-matrix",
    tags=["internal-route-family-matrix"],
)


def internal_route_family_matrix_service_dep() -> InternalRouteFamilyMatrixService:
    return InternalRouteFamilyMatrixService()


@router.get("/snapshot", response_model=InternalRouteFamilyMatrixResponse)
async def get_internal_route_family_matrix_snapshot(
    service: InternalRouteFamilyMatrixService = Depends(
        internal_route_family_matrix_service_dep
    ),
):
    result = service.build()
    return InternalRouteFamilyMatrixResponse(**result)
