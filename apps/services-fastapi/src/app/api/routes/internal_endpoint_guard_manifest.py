from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.internal_endpoint_guard_manifest import (
    InternalEndpointGuardManifestResponse,
)
from app.services.internal_endpoint_guard_manifest_service import (
    InternalEndpointGuardManifestService,
)

router = APIRouter(
    prefix="/internal-endpoint-guard-manifest",
    tags=["internal-endpoint-guard-manifest"],
)


def internal_endpoint_guard_manifest_service_dep() -> (
    InternalEndpointGuardManifestService
):
    return InternalEndpointGuardManifestService()


@router.get("/index", response_model=InternalEndpointGuardManifestResponse)
async def get_internal_endpoint_guard_manifest(
    service: InternalEndpointGuardManifestService = Depends(
        internal_endpoint_guard_manifest_service_dep
    ),
):
    result = service.build()
    return InternalEndpointGuardManifestResponse(**result)
