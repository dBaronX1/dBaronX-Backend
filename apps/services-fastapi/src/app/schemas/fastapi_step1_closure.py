from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FastapiStep1ClosureResponse(BaseModel):
    success: bool
    service: str
    status: str
    ready: bool
    timestamp: str | None = None
    blockers: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    fastapi_step1_closure: dict[str, Any]
    fastapiStep1Closure: dict[str, Any] | None = None
