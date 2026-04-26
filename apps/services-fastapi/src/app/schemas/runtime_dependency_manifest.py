from __future__ import annotations

from pydantic import BaseModel


class RuntimeDependencyManifestResponse(BaseModel):
    success: bool
    runtime_dependency_manifest: dict
