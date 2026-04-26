from __future__ import annotations

from pydantic import BaseModel


class RuntimeExportManifestResponse(BaseModel):
    success: bool
    runtime_export_manifest: dict
