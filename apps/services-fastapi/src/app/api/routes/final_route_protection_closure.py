from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.final_route_protection_closure import (
    FinalRouteProtectionClosureResponse,
)
from app.services.final_route_protection_closure_service import (
    FinalRouteProtectionClosureService,
)

router = APIRouter(
    prefix="/final-route-protection-closure",
    tags=["final-route-protection-closure"],
)


def final_route_protection_closure_service_dep() -> (
    FinalRouteProtectionClosureService
):
    return FinalRouteProtectionClosureService()


@router.get("/snapshot", response_model=FinalRouteProtectionClosureResponse)
async def get_final_route_protection_closure_snapshot(
    service: FinalRouteProtectionClosureService = Depends(
        final_route_protection_closure_service_dep
    ),
):
    result = service.build()
    return FinalRouteProtectionClosureResponse(**result)
