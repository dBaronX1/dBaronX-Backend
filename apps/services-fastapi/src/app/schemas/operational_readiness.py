from __future__ import annotations

from pydantic import BaseModel


class OperationalReadinessResponse(BaseModel):
    success: bool
    operational_readiness: dict
