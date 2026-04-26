from __future__ import annotations

from typing import Any

from core.settings import get_settings
from shared.http.http_client import InternalHttpClient


class FastApiClient:
    def __init__(self) -> None:
        self._http = InternalHttpClient()
        self._base_url = get_settings().FASTAPI_BASE_URL.rstrip("/")

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
