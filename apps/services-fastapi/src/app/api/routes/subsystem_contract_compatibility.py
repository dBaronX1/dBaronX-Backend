from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.subsystem_contract_compatibility import (
    SubsystemContractCompatibilityResponse,
)
from app.services.subsystem_contract_compatibility_service import (
    SubsystemContractCompatibilityService,
)

router = APIRouter(
    prefix="/subsystem-contract-compatibility",
    tags=["subsystem-contract-compatibility"],
)


def subsystem_contract_compatibility_service_dep() -> (
    SubsystemContractCompatibilityService
):
    return SubsystemContractCompatibilityService()


@router.get("/snapshot", response_model=SubsystemContractCompatibilityResponse)
async def get_subsystem_contract_compatibility_snapshot(
    service: SubsystemContractCompatibilityService = Depends(
        subsystem_contract_compatibility_service_dep
    ),
):
    result = service.build()
    return SubsystemContractCompatibilityResponse(**result)
