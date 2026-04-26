from __future__ import annotations

from pydantic import BaseModel


class PersistenceExportContractResponse(BaseModel):
    success: bool
    persistence_export_contract: dict
