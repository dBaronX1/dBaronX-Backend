from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.bootstrap_runtime_guard import BootstrapRuntimeGuardResponse
from app.services.bootstrap_runtime_guard_service import (
    BootstrapRuntimeGuardService,
)

router = APIRouter(
    prefix="/bootstrap-runtime-guard",
    tags=["bootstrap-runtime-guard"],
)


def bootstrap_runtime_guard_service_dep() -> BootstrapRuntimeGuardService:
    return BootstrapRuntimeGuardService()


@router.get("/snapshot", response_model=BootstrapRuntimeGuardResponse)
async def get_bootstrap_runtime_guard_snapshot(
    service: BootstrapRuntimeGuardService = Depends(
        bootstrap_runtime_guard_service_dep
    ),
):
    result = service.build()
    return BootstrapRuntimeGuardResponse(**result)
