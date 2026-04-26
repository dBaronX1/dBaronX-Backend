from __future__ import annotations

from pydantic import BaseModel


class SubsystemReadinessMatrixResponse(BaseModel):
    success: bool
    subsystem_readiness_matrix: dict
