from __future__ import annotations

from pydantic import BaseModel


class LaunchControlManifestResponse(BaseModel):
    success: bool
    launch_control_manifest: dict
