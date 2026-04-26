from __future__ import annotations

from pydantic import BaseModel


class InternalEndpointAccessMatrixResponse(BaseModel):
    success: bool
    internal_endpoint_access_matrix: dict
