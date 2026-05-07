from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RuntimeSnapshotResponse(BaseModel):
    success: bool
    service: str
    status: str
    ready: bool
    timestamp: str | None = None
    blockers: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    runtime_snapshot: dict[str, Any]
    runtimeSnapshot: dict[str, Any] | None = None
