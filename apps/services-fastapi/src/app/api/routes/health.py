from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends

from app.api.dependencies import internal_admin_service_dep
from app.services.internal_admin_service import InternalAdminService

router = APIRouter(tags=["health"])


@router.get(
    "/health/live",
    summary="Liveness probe",
)
async def live() -> dict:
    return {
        "success": True,
        "service": "dbaronx-fastapi",
        "status": "alive",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get(
    "/health/ready",
    summary="Readiness probe",
)
async def ready(
    service: InternalAdminService = Depends(internal_admin_service_dep),
) -> dict:
    result = await service.health()
    return {
        "success": result.success,
        "service": result.service,
        "status": "ready" if result.success else "not_ready",
        "dependencies": result.dependencies,
        "timestamp": result.timestamp,
    }


@router.get(
    "/health",
    summary="Detailed health",
)
async def detailed_health(
    service: InternalAdminService = Depends(internal_admin_service_dep),
) -> dict:
    result = await service.health()
    return result.model_dump()
