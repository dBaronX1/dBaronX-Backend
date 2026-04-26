from __future__ import annotations

from pydantic import BaseModel


class ProtectedRouteEnforcementAuditResponse(BaseModel):
    success: bool
    protected_route_enforcement_audit: dict
