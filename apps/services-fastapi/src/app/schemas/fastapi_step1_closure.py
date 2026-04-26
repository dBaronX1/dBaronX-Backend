from __future__ import annotations

from pydantic import BaseModel


class FastapiStep1ClosureResponse(BaseModel):
    success: bool
    fastapi_step1_closure: dict
