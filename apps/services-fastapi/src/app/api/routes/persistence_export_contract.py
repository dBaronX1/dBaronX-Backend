from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.persistence_export_contract import (
    PersistenceExportContractResponse,
)
from app.services.persistence_export_contract_service import (
    PersistenceExportContractService,
)

router = APIRouter(
    prefix="/persistence-export-contract",
    tags=["persistence-export-contract"],
)


def persistence_export_contract_service_dep() -> PersistenceExportContractService:
    return PersistenceExportContractService()


@router.get("/index", response_model=PersistenceExportContractResponse)
async def get_persistence_export_contract(
    service: PersistenceExportContractService = Depends(
        persistence_export_contract_service_dep
    ),
):
    result = service.build()
    return PersistenceExportContractResponse(**result)
