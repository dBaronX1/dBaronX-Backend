from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.expected_router_registry import (
    ExpectedRouterRegistryResponse,
)
from app.services.expected_router_registry_service import (
    ExpectedRouterRegistryService,
)

router = APIRouter(
    prefix="/expected-router-registry",
    tags=["expected-router-registry"],
)


def expected_router_registry_service_dep() -> ExpectedRouterRegistryService:
    return ExpectedRouterRegistryService()


@router.get("/index", response_model=ExpectedRouterRegistryResponse)
async def get_expected_router_registry(
    service: ExpectedRouterRegistryService = Depends(
        expected_router_registry_service_dep
    ),
):
    result = service.build()
    return ExpectedRouterRegistryResponse(**result)
