from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.launch_operation_manifest import (
    LaunchOperationManifestResponse,
)
from app.services.launch_operation_manifest_service import (
    LaunchOperationManifestService,
)

router = APIRouter(
    prefix="/launch-operation-manifest",
    tags=["launch-operation-manifest"],
)


def launch_operation_manifest_service_dep() -> LaunchOperationManifestService:
    return LaunchOperationManifestService()


@router.get("/snapshot", response_model=LaunchOperationManifestResponse)
async def get_launch_operation_manifest_snapshot(
    service: LaunchOperationManifestService = Depends(
        launch_operation_manifest_service_dep
    ),
):
    result = service.build()
    return LaunchOperationManifestResponse(**result)
