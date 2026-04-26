from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.decision_policy_registry import (
    DecisionPolicyRegistryResponse,
)
from app.services.decision_policy_registry_service import (
    DecisionPolicyRegistryService,
)

router = APIRouter(
    prefix="/decision-policy-registry",
    tags=["decision-policy-registry"],
)


def decision_policy_registry_service_dep() -> DecisionPolicyRegistryService:
    return DecisionPolicyRegistryService()


@router.get("/index", response_model=DecisionPolicyRegistryResponse)
async def get_decision_policy_registry(
    service: DecisionPolicyRegistryService = Depends(
        decision_policy_registry_service_dep
    ),
):
    result = service.build()
    return DecisionPolicyRegistryResponse(**result)
