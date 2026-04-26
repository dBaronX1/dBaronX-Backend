from __future__ import annotations

from pydantic import BaseModel


class DecisionContractCatalogResponse(BaseModel):
    success: bool
    contract_catalog: dict
