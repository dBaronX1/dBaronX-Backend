from __future__ import annotations

from pydantic import BaseModel


class StartupSequenceManifestResponse(BaseModel):
    success: bool
    startup_sequence_manifest: dict
