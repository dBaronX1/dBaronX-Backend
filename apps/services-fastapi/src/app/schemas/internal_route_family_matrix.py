from __future__ import annotations

from pydantic import BaseModel


class InternalRouteFamilyMatrixResponse(BaseModel):
    success: bool
    internal_route_family_matrix: dict
