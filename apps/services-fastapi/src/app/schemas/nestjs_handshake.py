from __future__ import annotations

from pydantic import BaseModel


class NestJsHandshakeResponse(BaseModel):
    success: bool
    nestjs_handshake: dict
