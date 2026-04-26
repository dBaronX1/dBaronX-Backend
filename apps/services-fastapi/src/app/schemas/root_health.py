from __future__ import annotations

from pydantic import BaseModel


class RootHealthResponse(BaseModel):
    success: bool
    health: dict
