from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.internal_access_contract import (
    InternalAccessContractResponse,
)
from app.services.internal_access_contract_service import (
    InternalAccessContractService,
)

router = APIRouter(
    prefix="/internal-access-contract",
    tags=["internal-access-contract"],
)


def internal_access_contract_service_dep() -> InternalAccessContractService:
    return InternalAccessContractService()


@router.get("/index", response_model=InternalAccessContractResponse)
async def get_internal_access_contract(
    service: InternalAccessContractService = Depends(
        internal_access_contract_service_dep
    ),
):
    result = service.build()
    return InternalAccessContractResponse(**result)
