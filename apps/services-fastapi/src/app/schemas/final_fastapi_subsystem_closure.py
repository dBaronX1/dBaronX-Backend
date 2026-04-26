from __future__ import annotations

from pydantic import BaseModel


class FinalFastapiSubsystemClosureResponse(BaseModel):
    success: bool
    final_fastapi_subsystem_closure: dict
