from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.decision_bundle import (
    DecisionBundleRequest,
    DecisionBundleResponse,
)
from app.services.decision_bundle_service import DecisionBundleService

router = APIRouter(prefix="/decision-bundle", tags=["decision-bundle"])


def decision_bundle_service_dep() -> DecisionBundleService:
    return DecisionBundleService()


@router.post("/build", response_model=DecisionBundleResponse)
async def build_decision_bundle(
    payload: DecisionBundleRequest,
    service: DecisionBundleService = Depends(
        decision_bundle_service_dep
    ),
):
    result = await service.build(
        bundle_type=payload.bundle_type,
        payload=payload.payload,
    )
    return DecisionBundleResponse(**result)
