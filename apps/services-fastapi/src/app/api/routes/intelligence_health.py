from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.intelligence_health import IntelligenceHealthResponse
from app.services.intelligence_health_service import IntelligenceHealthService

router = APIRouter(
    prefix="/intelligence-health",
    tags=["intelligence-health"],
)


def intelligence_health_service_dep() -> IntelligenceHealthService:
    return IntelligenceHealthService()


@router.get("/snapshot", response_model=IntelligenceHealthResponse)
async def get_intelligence_health_snapshot(
    service: IntelligenceHealthService = Depends(
        intelligence_health_service_dep
    ),
):
    result = service.build()
    return IntelligenceHealthResponse(**result)
