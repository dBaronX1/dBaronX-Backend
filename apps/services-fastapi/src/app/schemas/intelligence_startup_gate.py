from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class IntelligenceStartupGateResponse(BaseModel):
    success: bool
    service: str
    status: str
    ready: bool
    timestamp: str | None = None
    blockers: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    intelligence_startup_gate: dict[str, Any]
    intelligenceStartupGate: dict[str, Any] | None = None
