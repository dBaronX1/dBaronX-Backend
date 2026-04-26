from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.payment_intelligence_readiness import (
    PaymentIntelligenceReadinessResponse,
)
from app.services.payment_intelligence_readiness_service import (
    PaymentIntelligenceReadinessService,
)

router = APIRouter(
    prefix="/payment-intelligence-readiness",
    tags=["payment-intelligence-readiness"],
)


def payment_intelligence_readiness_service_dep() -> PaymentIntelligenceReadinessService:
    return PaymentIntelligenceReadinessService()


@router.get("/snapshot", response_model=PaymentIntelligenceReadinessResponse)
async def get_payment_intelligence_readiness_snapshot(
    service: PaymentIntelligenceReadinessService = Depends(
        payment_intelligence_readiness_service_dep
    ),
):
    result = service.build()
    return PaymentIntelligenceReadinessResponse(**result)
