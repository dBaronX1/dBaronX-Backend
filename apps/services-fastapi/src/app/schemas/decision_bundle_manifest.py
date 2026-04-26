from __future__ import annotations

from pydantic import BaseModel


class DecisionBundleManifestResponse(BaseModel):
    success: bool
    decision_bundle_manifest: dict
