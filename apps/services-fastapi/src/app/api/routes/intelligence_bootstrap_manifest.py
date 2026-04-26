from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.intelligence_bootstrap_manifest import (
    IntelligenceBootstrapManifestResponse,
)
from app.services.intelligence_bootstrap_manifest_service import (
    IntelligenceBootstrapManifestService,
)

router = APIRouter(
    prefix="/intelligence-bootstrap-manifest",
    tags=["intelligence-bootstrap-manifest"],
)


def intelligence_bootstrap_manifest_service_dep() -> (
    IntelligenceBootstrapManifestService
):
    return IntelligenceBootstrapManifestService()


@router.get("/snapshot", response_model=IntelligenceBootstrapManifestResponse)
async def get_intelligence_bootstrap_manifest_snapshot(
    service: IntelligenceBootstrapManifestService = Depends(
        intelligence_bootstrap_manifest_service_dep
    ),
):
    result = service.build()
    return IntelligenceBootstrapManifestResponse(**result)
