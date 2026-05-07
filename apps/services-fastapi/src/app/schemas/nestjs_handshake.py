from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class NestJsHandshakeResponse(BaseModel):
    success: bool
    service: str
    status: str
    ready: bool
    timestamp: str | None = None
    blockers: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    nestjs_handshake: dict[str, Any]
    nestjsHandshake: dict[str, Any] | None = None
