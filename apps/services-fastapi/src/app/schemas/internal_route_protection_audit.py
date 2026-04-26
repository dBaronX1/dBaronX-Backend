from __future__ import annotations

from pydantic import BaseModel


class InternalRouteProtectionAuditResponse(BaseModel):
    success: bool
    internal_route_protection_audit: dict
