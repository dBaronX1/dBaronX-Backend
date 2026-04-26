from __future__ import annotations

from pydantic import BaseModel


class LiveMountRegistryConsistencyResponse(BaseModel):
    success: bool
    live_mount_registry_consistency: dict
