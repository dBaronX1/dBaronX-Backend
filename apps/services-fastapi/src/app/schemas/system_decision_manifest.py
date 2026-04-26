from __future__ import annotations

from pydantic import BaseModel


class SystemDecisionManifestResponse(BaseModel):
    success: bool
    manifest: dict
