from __future__ import annotations

from pydantic import BaseModel


class LaunchOperationManifestResponse(BaseModel):
    success: bool
    launch_operation_manifest: dict
