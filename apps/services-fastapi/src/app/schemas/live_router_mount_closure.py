from __future__ import annotations

from pydantic import BaseModel


class LiveRouterMountClosureResponse(BaseModel):
    success: bool
    live_router_mount_closure: dict
