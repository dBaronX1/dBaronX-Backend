from __future__ import annotations

from pydantic import BaseModel


class IntelligenceHealthResponse(BaseModel):
    success: bool
    intelligence_health: dict
