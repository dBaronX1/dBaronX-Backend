from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.dependencies import get_internal_admin_service
from app.schemas.internal_admin import (
    ManualBlockRequest,
    ManualReviewDecisionRequest,
    RiskEventSearchRequest,
)
from app.services.internal_admin_service import InternalAdminService

router = APIRouter()


@router.post("/risk-events/search")
async def search_risk_events(
    payload: RiskEventSearchRequest,
    service: InternalAdminService = Depends(get_internal_admin_service),
) -> dict:
    return await service.search_risk_events(payload)


@router.post("/blocks")
async def create_manual_block(
    payload: ManualBlockRequest,
    service: InternalAdminService = Depends(get_internal_admin_service),
) -> dict:
    return await service.create_manual_block(payload)


@router.post("/reviews/decision")
async def manual_review_decision(
    payload: ManualReviewDecisionRequest,
    service: InternalAdminService = Depends(get_internal_admin_service),
) -> dict:
    return await service.submit_manual_review_decision(payload)
