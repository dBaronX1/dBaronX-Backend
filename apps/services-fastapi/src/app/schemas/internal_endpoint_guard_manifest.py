from __future__ import annotations

from pydantic import BaseModel


class InternalEndpointGuardManifestResponse(BaseModel):
    success: bool
    internal_endpoint_guard_manifest: dict
