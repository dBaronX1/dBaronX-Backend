from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.root_liveness import RootLivenessResponse
from app.services.root_liveness_service import RootLivenessService

router = APIRouter(
    prefix="/health",
    tags=["root-liveness"],
)


def root_liveness_service_dep() -> RootLivenessService:
    return RootLivenessService()


@router.get("/live", response_model=RootLivenessResponse)
async def get_root_liveness(
    service: RootLivenessService = Depends(root_liveness_service_dep),
):
    result = service.build()
    return RootLivenessResponse(**result)
