from __future__ import annotations

from pydantic import BaseModel


class RootStatusResponse(BaseModel):
    success: bool
    service: str
    status: str
    launch_ready: bool
    launch_band: str
    decision_surface_count: int
    route_count: int
    ready_subsystems: int
    total_subsystems: int
    blocker_count: int
