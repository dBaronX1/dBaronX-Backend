from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.launch_control_manifest import (
    LaunchControlManifestResponse,
)
from app.services.launch_control_manifest_service import (
    LaunchControlManifestService,
)

router = APIRouter(
    prefix="/launch-control-manifest",
    tags=["launch-control-manifest"],
)


def launch_control_manifest_service_dep() -> LaunchControlManifestService:
    return LaunchControlManifestService()


@router.get("/snapshot", response_model=LaunchControlManifestResponse)
async def get_launch_control_manifest_snapshot(
    service: LaunchControlManifestService = Depends(
        launch_control_manifest_service_dep
    ),
):
    result = service.build()
    return LaunchControlManifestResponse(**result)
