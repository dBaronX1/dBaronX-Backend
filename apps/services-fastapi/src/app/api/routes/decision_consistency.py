from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.decision_consistency import (
    DecisionConsistencyRequest,
    DecisionConsistencyResponse,
)
from app.services.decision_consistency_service import (
    DecisionConsistencyService,
)

router = APIRouter(
    prefix="/decision-consistency",
    tags=["decision-consistency"],
)


def decision_consistency_service_dep() -> DecisionConsistencyService:
    return DecisionConsistencyService()


@router.post("/evaluate", response_model=DecisionConsistencyResponse)
async def evaluate_decision_consistency(
    payload: DecisionConsistencyRequest,
    service: DecisionConsistencyService = Depends(
        decision_consistency_service_dep
    ),
):
    result = service.evaluate(surfaces=payload.surfaces)
    return DecisionConsistencyResponse(**result)
