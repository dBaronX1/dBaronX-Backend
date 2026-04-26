from __future__ import annotations

from pydantic import BaseModel


class RouterRegistryRuntimeResponse(BaseModel):
    success: bool
    router_registry_runtime: dict
