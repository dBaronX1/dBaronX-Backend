from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class LaunchControlManifestResponse(BaseModel):
    success: bool
    service: str
    status: str
    ready: bool
    timestamp: str | None = None
    blockers: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    launch_control_manifest: dict[str, Any]
    launchControlManifest: dict[str, Any] | None = None
