from __future__ import annotations

from pydantic import BaseModel


class ApiRouterAuditResponse(BaseModel):
    success: bool
    api_router_audit: dict
