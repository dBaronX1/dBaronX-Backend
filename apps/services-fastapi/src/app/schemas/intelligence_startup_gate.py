from __future__ import annotations

from pydantic import BaseModel


class IntelligenceStartupGateResponse(BaseModel):
    success: bool
    service: str
    status: str
    ready: bool
    timestamp: str | None = None
    blockers: list[str] = []
    capabilities: list[str] = []
    intelligence_startup_gate: dict
