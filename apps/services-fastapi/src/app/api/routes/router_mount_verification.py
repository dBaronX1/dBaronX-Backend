from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.router_mount_verification import (
    RouterMountVerificationResponse,
)
from app.services.router_mount_verification_service import (
    RouterMountVerificationService,
)

router = APIRouter(
    prefix="/router-mount-verification",
    tags=["router-mount-verification"],
)


def router_mount_verification_service_dep() -> RouterMountVerificationService:
    return RouterMountVerificationService()


@router.get("/snapshot", response_model=RouterMountVerificationResponse)
async def get_router_mount_verification_snapshot(
    service: RouterMountVerificationService = Depends(
        router_mount_verification_service_dep
    ),
):
    result = service.build()
    return RouterMountVerificationResponse(**result)
