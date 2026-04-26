from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.root_status import RootStatusResponse
from app.services.root_status_service import RootStatusService

router = APIRouter(
    tags=["root-status"],
)


def root_status_service_dep() -> RootStatusService:
    return RootStatusService()


@router.get("/", response_model=RootStatusResponse)
async def get_root_status(
    service: RootStatusService = Depends(root_status_service_dep),
):
    result = service.build()
    return RootStatusResponse(**result)
