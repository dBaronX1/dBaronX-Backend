from __future__ import annotations

from pydantic import BaseModel


class DependencyWiringAuditResponse(BaseModel):
    success: bool
    dependency_wiring_audit: dict
