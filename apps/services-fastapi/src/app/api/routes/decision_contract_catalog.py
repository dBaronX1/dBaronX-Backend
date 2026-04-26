from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.decision_contract_catalog import (
    DecisionContractCatalogResponse,
)
from app.services.decision_contract_catalog_service import (
    DecisionContractCatalogService,
)

router = APIRouter(
    prefix="/decision-contract-catalog",
    tags=["decision-contract-catalog"],
)


def decision_contract_catalog_service_dep() -> DecisionContractCatalogService:
    return DecisionContractCatalogService()


@router.get("/index", response_model=DecisionContractCatalogResponse)
async def get_decision_contract_catalog(
    service: DecisionContractCatalogService = Depends(
        decision_contract_catalog_service_dep
    ),
):
    result = service.build()
    return DecisionContractCatalogResponse(**result)
