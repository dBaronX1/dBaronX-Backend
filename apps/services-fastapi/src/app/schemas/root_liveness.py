from __future__ import annotations

from pydantic import BaseModel


class RootLivenessResponse(BaseModel):
    success: bool
    liveness: dict
