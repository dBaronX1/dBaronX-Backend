from __future__ import annotations

from typing import Any

from core.settings import get_settings
from shared.http.http_client import InternalHttpClient


class NestJsClient:
    def __init__(self) -> None:
        self._http = InternalHttpClient()
        self._base_url = get_settings().api_base_url

    async def get_system_admin_pack(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/platform/admin-pack",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_launch_closure(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/system/launch-closure",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_readiness_matrix(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/system/readiness-matrix",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_payout_review_queue(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/payouts/review-queue",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def approve_payout(
        self,
        payout_request_id: str,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.post(
            self._base_url,
            f"/api/v1/payouts/{payout_request_id}/approve",
            json_body={},
            actor_id=actor_id,
            request_id=request_id,
        )

    async def reject_payout(
        self,
        payout_request_id: str,
        *,
        actor_id: str,
        reason: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if reason:
            body["reason"] = reason
        return await self._http.post(
            self._base_url,
            f"/api/v1/payouts/{payout_request_id}/reject",
            json_body=body,
            actor_id=actor_id,
            request_id=request_id,
        )

    async def settle_payout(
        self,
        payout_request_id: str,
        *,
        actor_id: str,
        external_reference: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if external_reference:
            body["externalReference"] = external_reference
        return await self._http.post(
            self._base_url,
            f"/api/v1/payouts/{payout_request_id}/settle",
            json_body=body,
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_ads_review_queue(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/ads/review/queue",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_ai_story_review_queue(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/ai-stories/review/queue",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_supplier_admin_dashboard(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/suppliers/admin/dashboard",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_platform_admin_pack(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/platform/admin-pack",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_system_admin_summary(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/system/admin-summary/dashboard",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_system_admin_actions_pack(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/system/admin-action-pack",
            actor_id=actor_id,
            request_id=request_id,
        )

    async def get_commerce_admin_dashboard(
        self,
        *,
        actor_id: str,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._http.get(
            self._base_url,
            "/api/v1/commerce/admin/dashboard",
            actor_id=actor_id,
            request_id=request_id,
        )
