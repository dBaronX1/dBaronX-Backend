from __future__ import annotations

from pydantic import BaseModel


class TelegramOperationalManifestResponse(BaseModel):
    success: bool
    telegram_operational_manifest: dict
