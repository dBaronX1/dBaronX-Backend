from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import (
    affiliate_risk_service_dep,
    checkout_risk_service_dep,
    watch_risk_service_dep,
)
from app.schemas.risk import (
    AffiliateRiskRequest,
    CheckoutRiskRequest,
    RiskDecisionResponse,
    WatchRiskRequest,
)
from app.services.affiliate_risk_service import AffiliateRiskService
from app.services.checkout_risk_service import CheckoutRiskService
from app.services.watch_risk_service import WatchRiskService

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post(
    "/checkout",
    response_model=RiskDecisionResponse,
    summary="Score checkout risk for NestJS commerce orchestration",
)
async def score_checkout(
    payload: CheckoutRiskRequest,
    service: CheckoutRiskService = Depends(checkout_risk_service_dep),
) -> RiskDecisionResponse:
    return await service.evaluate(payload)


@router.post(
    "/affiliate",
    response_model=RiskDecisionResponse,
    summary="Score affiliate event risk and abuse probability",
)
async def score_affiliate(
    payload: AffiliateRiskRequest,
    service: AffiliateRiskService = Depends(affiliate_risk_service_dep),
) -> RiskDecisionResponse:
    return await service.evaluate(payload)


@router.post(
    "/watch",
    response_model=RiskDecisionResponse,
    summary="Score watch-to-earn session telemetry risk",
)
async def score_watch(
    payload: WatchRiskRequest,
    service: WatchRiskService = Depends(watch_risk_service_dep),
) -> RiskDecisionResponse:
    return await service.evaluate(payload)
