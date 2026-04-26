from __future__ import annotations

from pydantic import BaseModel


class FinalEnforcementSweepResponse(BaseModel):
    success: bool
    final_enforcement_sweep: dict
