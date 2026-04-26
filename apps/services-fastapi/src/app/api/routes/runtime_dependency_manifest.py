from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.internal_access import optional_internal_access
from app.core.security.request_identity import RequestIdentity
from app.schemas.runtime_dependency_manifest import (
    RuntimeDependencyManifestResponse,
)
from app.services.runtime_dependency_manifest_service import (
    RuntimeDependencyManifestService,
)

router = APIRouter(
    prefix="/runtime-dependency-manifest",
    tags=["runtime-dependency-manifest"],
)


def runtime_dependency_manifest_service_dep() -> RuntimeDependencyManifestService:
    return RuntimeDependencyManifestService()


@router.get("/snapshot", response_model=RuntimeDependencyManifestResponse)
async def get_runtime_dependency_manifest_snapshot(
    _identity: RequestIdentity = Depends(optional_internal_access),
    service: RuntimeDependencyManifestService = Depends(
        runtime_dependency_manifest_service_dep
    ),
):
    result = service.build()
    return RuntimeDependencyManifestResponse(**result)
