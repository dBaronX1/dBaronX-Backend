from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from crypto.dependencies.dbx_dependencies import InternalAuthDependency, get_health_service
from crypto.health.dbx_health import DbxHealthService

router = APIRouter(prefix="/internal/dbx", tags=["internal-dbx-health"])


@router.get("/health")
async def dbx_health(
    _auth: InternalAuthDependency,
    health: Annotated[DbxHealthService, Depends(get_health_service)],
) -> dict:
    return await health.health()


@router.get("/ready")
async def dbx_ready(
    _auth: InternalAuthDependency,
    health: Annotated[DbxHealthService, Depends(get_health_service)],
) -> dict:
    result = await health.health()
    return {
        **result,
        "ready": bool(result.get("ok")),
    }