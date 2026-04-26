from __future__ import annotations

from pydantic import BaseModel


class ExpectedRouterRegistryResponse(BaseModel):
    success: bool
    expected_router_registry: dict
