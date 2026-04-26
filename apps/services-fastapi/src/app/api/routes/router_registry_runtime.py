from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.router_registry_runtime import RouterRegistryRuntimeResponse
from app.services.router_registry_runtime_service import (
    RouterRegistryRuntimeService,
)

router = APIRouter(
    prefix="/router-registry-runtime",
    tags=["router-registry-runtime"],
)


def router_registry_runtime_service_dep() -> RouterRegistryRuntimeService:
    return RouterRegistryRuntimeService()


@router.get("/snapshot", response_model=RouterRegistryRuntimeResponse)
async def get_router_registry_runtime_snapshot(
    service: RouterRegistryRuntimeService = Depends(
        router_registry_runtime_service_dep
    ),
):
    result = service.build()
    return RouterRegistryRuntimeResponse(**result)
