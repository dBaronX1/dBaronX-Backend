from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.internal_endpoint_access_matrix import (
    InternalEndpointAccessMatrixResponse,
)
from app.services.internal_endpoint_access_matrix_service import (
    InternalEndpointAccessMatrixService,
)

router = APIRouter(
    prefix="/internal-endpoint-access-matrix",
    tags=["internal-endpoint-access-matrix"],
)


def internal_endpoint_access_matrix_service_dep() -> (
    InternalEndpointAccessMatrixService
):
    return InternalEndpointAccessMatrixService()


@router.get("/index", response_model=InternalEndpointAccessMatrixResponse)
async def get_internal_endpoint_access_matrix(
    service: InternalEndpointAccessMatrixService = Depends(
        internal_endpoint_access_matrix_service_dep
    ),
):
    result = service.build()
    return InternalEndpointAccessMatrixResponse(**result)
