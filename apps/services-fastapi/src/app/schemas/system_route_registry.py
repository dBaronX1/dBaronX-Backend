from __future__ import annotations

from pydantic import BaseModel


class SystemRouteRegistryResponse(BaseModel):
    success: bool
    route_registry: dict
