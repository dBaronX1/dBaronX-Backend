from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.economic_surface_coverage import (
    EconomicSurfaceCoverageResponse,
)
from app.services.economic_surface_coverage_service import (
    EconomicSurfaceCoverageService,
)

router = APIRouter(
    prefix="/economic-surface-coverage",
    tags=["economic-surface-coverage"],
)


def economic_surface_coverage_service_dep() -> EconomicSurfaceCoverageService:
    return EconomicSurfaceCoverageService()


@router.get("/snapshot", response_model=EconomicSurfaceCoverageResponse)
async def get_economic_surface_coverage_snapshot(
    service: EconomicSurfaceCoverageService = Depends(
        economic_surface_coverage_service_dep
    ),
):
    result = service.build()
    return EconomicSurfaceCoverageResponse(**result)
