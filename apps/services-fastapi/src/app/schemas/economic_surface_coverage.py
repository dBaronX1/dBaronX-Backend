from __future__ import annotations

from pydantic import BaseModel


class EconomicSurfaceCoverageResponse(BaseModel):
    success: bool
    economic_surface_coverage: dict
