from __future__ import annotations

from pydantic import BaseModel


class InternalAuthMiddlewareAuditResponse(BaseModel):
    success: bool
    internal_auth_middleware_audit: dict
