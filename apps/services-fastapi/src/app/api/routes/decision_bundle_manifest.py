from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.decision_bundle_manifest import (
    DecisionBundleManifestResponse,
)
from app.services.decision_bundle_manifest_service import (
    DecisionBundleManifestService,
)

router = APIRouter(
    prefix="/decision-bundle-manifest",
    tags=["decision-bundle-manifest"],
)


def decision_bundle_manifest_service_dep() -> DecisionBundleManifestService:
    return DecisionBundleManifestService()


@router.get("/index", response_model=DecisionBundleManifestResponse)
async def get_decision_bundle_manifest(
    service: DecisionBundleManifestService = Depends(
        decision_bundle_manifest_service_dep
    ),
):
    result = service.build()
    return DecisionBundleManifestResponse(**result)
