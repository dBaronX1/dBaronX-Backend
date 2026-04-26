from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.root_readiness import RootReadinessResponse
from app.services.root_readiness_service import RootReadinessService

router = APIRouter(
    prefix="/health",
    tags=["root-readiness"],
)


def root_readiness_service_dep() -> RootReadinessService:
    return RootReadinessService()


@router.get("/ready", response_model=RootReadinessResponse)
async def get_root_readiness(
    service: RootReadinessService = Depends(root_readiness_service_dep),
):
    result = service.build()
    return RootReadinessResponse(**result)
