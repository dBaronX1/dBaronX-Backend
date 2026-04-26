from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.deployment_checklist import DeploymentChecklistResponse
from app.services.deployment_checklist_service import (
    DeploymentChecklistService,
)

router = APIRouter(
    prefix="/deployment-checklist",
    tags=["deployment-checklist"],
)


def deployment_checklist_service_dep() -> DeploymentChecklistService:
    return DeploymentChecklistService()


@router.get("/snapshot", response_model=DeploymentChecklistResponse)
async def get_deployment_checklist_snapshot(
    service: DeploymentChecklistService = Depends(
        deployment_checklist_service_dep
    ),
):
    result = service.build()
    return DeploymentChecklistResponse(**result)
