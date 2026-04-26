from __future__ import annotations

from pydantic import BaseModel


class InternalAccessContractResponse(BaseModel):
    success: bool
    internal_access_contract: dict
