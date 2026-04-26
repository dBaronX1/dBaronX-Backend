from __future__ import annotations

from pydantic import BaseModel


class StartupValidationResponse(BaseModel):
    success: bool
    startup_validation: dict
