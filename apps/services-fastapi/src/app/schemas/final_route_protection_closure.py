from __future__ import annotations

from pydantic import BaseModel


class FinalRouteProtectionClosureResponse(BaseModel):
    success: bool
    final_route_protection_closure: dict
