from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.intelligence_capability import (
    IntelligenceCapabilityResponse,
)
from app.services.intelligence_capability_service import (
    IntelligenceCapabilityService,
)

router = APIRouter(
    prefix="/intelligence-capability",
    tags=["intelligence-capability"],
)


def intelligence_capability_service_dep() -> IntelligenceCapabilityService:
    return IntelligenceCapabilityService()


@router.get("/summary", response_model=IntelligenceCapabilityResponse)
async def get_intelligence_capability_summary(
    service: IntelligenceCapabilityService = Depends(
        intelligence_capability_service_dep
    ),
):
    result = service.build()
    return IntelligenceCapabilityResponse(**result)
