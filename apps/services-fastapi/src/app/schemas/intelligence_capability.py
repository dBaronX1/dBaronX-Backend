from __future__ import annotations

from pydantic import BaseModel


class IntelligenceCapabilityResponse(BaseModel):
    success: bool
    capabilities: dict
