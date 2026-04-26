from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.internal_access import require_internal_access
from app.core.security.request_identity import RequestIdentity
from app.schemas.runtime_export_manifest import RuntimeExportManifestResponse
from app.services.runtime_export_manifest_service import (
    RuntimeExportManifestService,
)

router = APIRouter(
    prefix="/runtime-export-manifest",
    tags=["runtime-export-manifest"],
)


def runtime_export_manifest_service_dep() -> RuntimeExportManifestService:
    return RuntimeExportManifestService()


@router.get("/snapshot", response_model=RuntimeExportManifestResponse)
async def get_runtime_export_manifest_snapshot(
    _identity: RequestIdentity = Depends(require_internal_access),
    service: RuntimeExportManifestService = Depends(
        runtime_export_manifest_service_dep
    ),
):
    result = service.build()
    return RuntimeExportManifestResponse(**result)
