from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.live_router_mount_closure import LiveRouterMountClosureResponse
from app.services.live_router_mount_closure_service import (
    LiveRouterMountClosureService,
)

router = APIRouter(
    prefix="/live-router-mount-closure",
    tags=["live-router-mount-closure"],
)


def live_router_mount_closure_service_dep() -> LiveRouterMountClosureService:
    return LiveRouterMountClosureService()


@router.get("/snapshot", response_model=LiveRouterMountClosureResponse)
async def get_live_router_mount_closure_snapshot(
    service: LiveRouterMountClosureService = Depends(
        live_router_mount_closure_service_dep
    ),
):
    result = service.build()
    return LiveRouterMountClosureResponse(**result)
