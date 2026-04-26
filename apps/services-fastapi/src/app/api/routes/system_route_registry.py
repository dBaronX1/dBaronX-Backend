from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.system_route_registry import SystemRouteRegistryResponse
from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)

router = APIRouter(
    prefix="/system-route-registry",
    tags=["system-route-registry"],
)


def system_route_registry_service_dep() -> SystemRouteRegistryService:
    return SystemRouteRegistryService()


@router.get("/index", response_model=SystemRouteRegistryResponse)
async def get_system_route_registry(
    service: SystemRouteRegistryService = Depends(
        system_route_registry_service_dep
    ),
):
    result = service.build()
    return SystemRouteRegistryResponse(**result)
