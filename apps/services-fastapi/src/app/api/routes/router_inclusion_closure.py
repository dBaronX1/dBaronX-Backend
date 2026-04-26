from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.router_inclusion_closure import (
    RouterInclusionClosureResponse,
)
from app.services.router_inclusion_closure_service import (
    RouterInclusionClosureService,
)

router = APIRouter(
    prefix="/router-inclusion-closure",
    tags=["router-inclusion-closure"],
)


def router_inclusion_closure_service_dep() -> RouterInclusionClosureService:
    return RouterInclusionClosureService()


@router.get("/snapshot", response_model=RouterInclusionClosureResponse)
async def get_router_inclusion_closure_snapshot(
    service: RouterInclusionClosureService = Depends(
        router_inclusion_closure_service_dep
    ),
):
    result = service.build()
    return RouterInclusionClosureResponse(**result)
