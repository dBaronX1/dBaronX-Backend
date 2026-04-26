from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.live_mount_registry_consistency import (
    LiveMountRegistryConsistencyResponse,
)
from app.services.live_mount_registry_consistency_service import (
    LiveMountRegistryConsistencyService,
)

router = APIRouter(
    prefix="/live-mount-registry-consistency",
    tags=["live-mount-registry-consistency"],
)


def live_mount_registry_consistency_service_dep() -> (
    LiveMountRegistryConsistencyService
):
    return LiveMountRegistryConsistencyService()


@router.get("/snapshot", response_model=LiveMountRegistryConsistencyResponse)
async def get_live_mount_registry_consistency_snapshot(
    service: LiveMountRegistryConsistencyService = Depends(
        live_mount_registry_consistency_service_dep
    ),
):
    result = service.build()
    return LiveMountRegistryConsistencyResponse(**result)
