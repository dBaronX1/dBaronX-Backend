from __future__ import annotations

from pydantic import BaseModel


class BootstrapRuntimeGuardResponse(BaseModel):
    success: bool
    bootstrap_runtime_guard: dict
