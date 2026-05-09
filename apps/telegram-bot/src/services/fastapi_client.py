from __future__ import annotations

from typing import Any

from core.settings import get_settings
from shared.http.http_client import InternalHttpClient


class FastApiClient:
    async def health(
        self,
        *,
        actor_id: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        if not self._base_url:
            return {"success": False, "data": {}, "blockers": ["FASTAPI_BASE_URL_missing"], "statusCode": 0, "message": "FASTAPI_BASE_URL missing"}
        return await self._http.get(
            self._base_url,
            "/health",
            actor_id=actor_id,
            request_id=request_id,
            internal=False,
        )

    def __init__(self) -> None:
        self._http = InternalHttpClient()
        self._base_url = get_settings().fastapi_base_url

    async def get_fastapi_handoff_pack(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/fastapi-handoff-pack/snapshot",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_final_enforcement_sweep(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/final-enforcement-sweep/snapshot",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_final_fastapi_subsystem_closure(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/final-fastapi-subsystem-closure/snapshot",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_internal_route_family_matrix(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/internal-route-family-matrix/snapshot",
            actor_id=actor_id,
            request_id=request_id,
        )
