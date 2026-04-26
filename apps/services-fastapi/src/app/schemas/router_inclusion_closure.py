from __future__ import annotations

from pydantic import BaseModel


class RouterInclusionClosureResponse(BaseModel):
    success: bool
    router_inclusion_closure: dict
