from __future__ import annotations

from pydantic import BaseModel


class DecisionPolicyRegistryResponse(BaseModel):
    success: bool
    policies: dict
