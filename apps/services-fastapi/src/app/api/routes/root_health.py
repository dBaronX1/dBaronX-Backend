from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.root_health import RootHealthResponse
from app.services.root_health_service import RootHealthService

router = APIRouter(
    prefix="/health",
    tags=["root-health"],
)


def root_health_service_dep() -> RootHealthService:
    return RootHealthService()


@router.get("", response_model=RootHealthResponse)
async def get_root_health(
    service: RootHealthService = Depends(root_health_service_dep),
):
    result = service.build()
    return RootHealthResponse(**result)
