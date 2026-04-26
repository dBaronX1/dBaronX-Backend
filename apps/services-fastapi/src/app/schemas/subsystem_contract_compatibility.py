from __future__ import annotations

from pydantic import BaseModel


class SubsystemContractCompatibilityResponse(BaseModel):
    success: bool
    subsystem_contract_compatibility: dict
