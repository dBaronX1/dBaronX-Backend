from __future__ import annotations

from pydantic import BaseModel


class RuntimeSnapshotResponse(BaseModel):
    success: bool
    runtime_snapshot: dict
