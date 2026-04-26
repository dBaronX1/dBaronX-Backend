from __future__ import annotations

from pydantic import BaseModel


class FinalOperationalClosureResponse(BaseModel):
    success: bool
    final_operational_closure: dict
