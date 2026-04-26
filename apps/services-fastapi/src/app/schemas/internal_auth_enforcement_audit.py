from __future__ import annotations

from pydantic import BaseModel


class InternalAuthEnforcementAuditResponse(BaseModel):
    success: bool
    internal_auth_enforcement_audit: dict
