from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.system_decision_manifest import SystemDecisionManifestResponse
from app.services.system_decision_manifest_service import (
    SystemDecisionManifestService,
)

router = APIRouter(
    prefix="/system-decision-manifest",
    tags=["system-decision-manifest"],
)


def system_decision_manifest_service_dep() -> SystemDecisionManifestService:
    return SystemDecisionManifestService()


@router.get("/index", response_model=SystemDecisionManifestResponse)
async def get_system_decision_manifest(
    service: SystemDecisionManifestService = Depends(
        system_decision_manifest_service_dep
    ),
):
    result = service.build()
    return SystemDecisionManifestResponse(**result)
