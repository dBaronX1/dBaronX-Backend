from __future__ import annotations

from pydantic import BaseModel


class FastapiHandoffPackResponse(BaseModel):
    success: bool
    fastapi_handoff_pack: dict
