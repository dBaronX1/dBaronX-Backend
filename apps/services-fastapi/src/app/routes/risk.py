from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.dependencies import get_risk_service
from app.schemas.risk import (
    AffiliateRiskRequest,
    CheckoutRiskRequest,
    RiskDecisionResponse,
    WatchRiskRequest,
)
from app.services.risk_service import RiskService

router = APIRouter()


@router.post("/checkout", response_model=RiskDecisionResponse)
async def score_checkout(
    payload: CheckoutRiskRequest,
    service: RiskService = Depends(get_risk_service),
) -> RiskDecisionResponse:
    result = await service.score_checkout(payload)
    return RiskDecisionResponse(**result)


@router.post("/affiliate", response_model=RiskDecisionResponse)
async def score_affiliate(
    payload: AffiliateRiskRequest,
    service: RiskService = Depends(get_risk_service),
) -> RiskDecisionResponse:
    result = await service.score_affiliate(payload)
    return RiskDecisionResponse(**result)


@router.post("/watch", response_model=RiskDecisionResponse)
async def score_watch(
    payload: WatchRiskRequest,
    service: RiskService = Depends(get_risk_service),
) -> RiskDecisionResponse:
    result = await service.score_watch(payload)
    return RiskDecisionResponse(**result)
