from __future__ import annotations

from pydantic import BaseModel


class PublicRuntimeSummaryResponse(BaseModel):
    success: bool
    public_runtime_summary: dict
