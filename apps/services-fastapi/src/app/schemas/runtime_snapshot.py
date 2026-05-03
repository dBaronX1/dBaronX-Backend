from __future__ import annotations

from pydantic import BaseModel


class RuntimeSnapshotResponse(BaseModel):
    success: bool
    service: str
    status: str
    ready: bool
    timestamp: str | None = None
    blockers: list[str] = []
    capabilities: list[str] = []
    runtime_snapshot: dict
