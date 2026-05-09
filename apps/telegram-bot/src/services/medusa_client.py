from __future__ import annotations

from typing import Any

from core.settings import get_settings
from shared.http.http_client import InternalHttpClient


class MedusaClient:
    def __init__(self) -> None:
        self._http = InternalHttpClient()
        self._base_url = get_settings().medusa_base_url

    async def health(self, *, actor_id: str | None = None, request_id: str | None = None) -> dict[str, Any]:
        if not self._base_url:
            return {"success": False, "data": {}, "blockers": ["MEDUSA_BASE_URL_missing"], "statusCode": 0, "message": "MEDUSA_BASE_URL missing"}
        return await self._http.get(self._base_url, "/health", actor_id=actor_id, request_id=request_id, internal=False)
