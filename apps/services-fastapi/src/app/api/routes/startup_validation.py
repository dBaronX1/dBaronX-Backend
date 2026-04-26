from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.startup_validation import StartupValidationResponse
from app.services.startup_validation_service import StartupValidationService

router = APIRouter(
    prefix="/startup-validation",
    tags=["startup-validation"],
)


def startup_validation_service_dep() -> StartupValidationService:
    return StartupValidationService()


@router.get("/snapshot", response_model=StartupValidationResponse)
async def get_startup_validation_snapshot(
    service: StartupValidationService = Depends(
        startup_validation_service_dep
    ),
):
    result = service.build()
    return StartupValidationResponse(**result)
