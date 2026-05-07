from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.routes.snapshot_contract import (
    compat_snapshot,
    degraded_snapshot,
    exception_blocker,
)

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
    try:
        result = service.build()
    except Exception as exc:
        return degraded_snapshot(
            "launch_control_manifest",
            exception_blocker("launch_control_manifest", exc),
        )

    return compat_snapshot("launch_control_manifest", result)
