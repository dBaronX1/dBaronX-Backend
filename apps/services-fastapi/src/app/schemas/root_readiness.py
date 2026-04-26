from __future__ import annotations

from pydantic import BaseModel


class RootReadinessResponse(BaseModel):
    success: bool
    readiness: dict
