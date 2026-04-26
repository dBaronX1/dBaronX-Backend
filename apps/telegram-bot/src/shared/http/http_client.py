from __future__ import annotations

from typing import Any

import httpx

from core.settings import get_settings


class InternalHttpClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._timeout = httpx.Timeout(settings.REQUEST_TIMEOUT_SECONDS)

    async def get(
        self,
        base_url: str,
        path: str,
        *,
        actor_id: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        settings = get_settings()
        headers = {
            "x-internal-token": settings.INTERNAL_SERVICE_TOKEN,
            "x-caller-service": "dbaronx-telegram-bot",
            "x-caller-surface": "telegram",
        }
        if actor_id:
            headers["x-actor-id"] = actor_id
        if request_id:
            headers["x-request-id"] = request_id

        async with httpx.AsyncClient(timeout=self._timeout, base_url=base_url) as client:
            response = await client.get(path, headers=headers)
            response.raise_for_status()
            return response.json()

    async def post(
        self,
        base_url: str,
        path: str,
        *,
        json_body: dict[str, Any],
        actor_id: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        settings = get_settings()
        headers = {
            "x-internal-token": settings.INTERNAL_SERVICE_TOKEN,
            "x-caller-service": "dbaronx-telegram-bot",
            "x-caller-surface": "telegram",
        }
        if actor_id:
            headers["x-actor-id"] = actor_id
        if request_id:
            headers["x-request-id"] = request_id

        async with httpx.AsyncClient(timeout=self._timeout, base_url=base_url) as client:
            response = await client.post(path, json=json_body, headers=headers)
            response.raise_for_status()
            return response.json()
