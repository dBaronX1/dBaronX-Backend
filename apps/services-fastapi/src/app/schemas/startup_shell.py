from __future__ import annotations

from pydantic import BaseModel


class StartupShellResponse(BaseModel):
    success: bool
    startup_shell: dict
