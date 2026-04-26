from __future__ import annotations

from pydantic import BaseModel


class IntelligenceStartupGateResponse(BaseModel):
    success: bool
    intelligence_startup_gate: dict
