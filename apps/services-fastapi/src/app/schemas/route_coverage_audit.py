from __future__ import annotations

from pydantic import BaseModel


class RouteCoverageAuditResponse(BaseModel):
    success: bool
    route_coverage_audit: dict
