from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.operational_readiness import OperationalReadinessResponse
from app.services.operational_readiness_service import (
    OperationalReadinessService,
)

router = APIRouter(
    prefix="/operational-readiness",
    tags=["operational-readiness"],
)


def operational_readiness_service_dep() -> OperationalReadinessService:
    return OperationalReadinessService()


@router.get("/snapshot", response_model=OperationalReadinessResponse)
async def get_operational_readiness_snapshot(
    service: OperationalReadinessService = Depends(
        operational_readiness_service_dep
    ),
):
    result = service.build()
    return OperationalReadinessResponse(**result)
