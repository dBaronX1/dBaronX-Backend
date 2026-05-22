from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse
from typing import Any

from core.settings import get_settings
from shared.http.http_client import InternalHttpClient


@dataclass(frozen=True)
class ApiPathConfig:
    base_url: str
    api_base_had_api_suffix: bool


def _normalize_api_path_config(raw_base_url: str) -> ApiPathConfig:
    base_url = (raw_base_url or "").rstrip("/")
    lowered = base_url.lower()
    api_suffix = "/api"
    has_api_suffix = lowered.endswith(api_suffix)
    if has_api_suffix:
        base_url = base_url[:-len(api_suffix)]
    return ApiPathConfig(base_url=base_url.rstrip("/"), api_base_had_api_suffix=has_api_suffix)


def _api_path(path_after_api: str) -> str:
    suffix = path_after_api if path_after_api.startswith("/") else f"/{path_after_api}"
    return f"/api{suffix}"


class NestJsClient:
    def __init__(self) -> None:
        self._http = InternalHttpClient()
        config = _normalize_api_path_config(get_settings().api_base_url)
        self._base_url = config.base_url
        self.api_base_had_api_suffix = config.api_base_had_api_suffix

    @property
    def api_host(self) -> str:
        parsed = urlparse(self._base_url)
        return parsed.netloc or self._base_url

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

    def cj_products_endpoint_path(self, suffix: str) -> str:
        suffix_value = suffix if suffix.startswith("/") else f"/{suffix}"
        return _api_path(f"/admin/cj/products{suffix_value}")

    async def cj_import_preview(self, *, category: str, limit: int, actor_id: str, request_id: str | None = None) -> dict[str, Any]:
        return await self._http.post(self._base_url, _api_path("/admin/cj/products/import-preview"), json_body={"category": category, "limit": limit}, actor_id=actor_id, request_id=request_id)

    async def cj_import_run(self, *, category: str, limit: int, actor_id: str, request_id: str | None = None) -> dict[str, Any]:
        return await self._http.post(self._base_url, _api_path("/admin/cj/products/import-run"), json_body={"category": category, "limit": limit}, actor_id=actor_id, request_id=request_id)

    async def cj_import_runs(self, *, actor_id: str, request_id: str | None = None) -> dict[str, Any]:
        return await self._http.get(self._base_url, _api_path("/admin/cj/products/import-runs"), actor_id=actor_id, request_id=request_id)

    async def cj_import_items(self, *, actor_id: str, request_id: str | None = None) -> dict[str, Any]:
        return await self._http.get(self._base_url, _api_path("/admin/cj/products/import-items"), actor_id=actor_id, request_id=request_id)

    async def cj_import_approve(self, *, item_id: str, actor_id: str, request_id: str | None = None) -> dict[str, Any]:
        return await self._http.post(self._base_url, _api_path(f"/admin/cj/products/import-items/{item_id}/approve"), json_body={}, actor_id=actor_id, request_id=request_id)

    async def cj_import_reject(self, *, item_id: str, actor_id: str, request_id: str | None = None) -> dict[str, Any]:
        return await self._http.post(self._base_url, _api_path(f"/admin/cj/products/import-items/{item_id}/reject"), json_body={}, actor_id=actor_id, request_id=request_id)

    async def cj_publish_approved(self, *, actor_id: str, request_id: str | None = None) -> dict[str, Any]:
        return await self._http.post(self._base_url, _api_path("/admin/cj/products/publish-approved"), json_body={}, actor_id=actor_id, request_id=request_id)
