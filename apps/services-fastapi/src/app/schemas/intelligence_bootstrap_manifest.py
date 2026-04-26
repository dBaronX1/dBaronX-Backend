from __future__ import annotations

from pydantic import BaseModel


class IntelligenceBootstrapManifestResponse(BaseModel):
    success: bool
    intelligence_bootstrap_manifest: dict
