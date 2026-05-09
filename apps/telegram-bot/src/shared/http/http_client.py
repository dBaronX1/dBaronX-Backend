from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

import httpx

from core.settings import get_settings

logger = logging.getLogger(__name__)
SECRET_WORDS = ("token", "secret", "key", "authorization", "service_role", "password")


def sanitize_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): ("[redacted]" if any(word in str(key).lower() for word in SECRET_WORDS) else sanitize_value(val))
            for key, val in value.items()
        }
    if isinstance(value, list):
        return [sanitize_value(item) for item in value]
    if isinstance(value, str):
        redacted = value
        for marker in ("sk_", "whsec_", "xox", "ghp_", "Bearer "):
            if marker in redacted:
                return "[redacted]"
        return redacted
    return value


def normalize_response(payload: Any, *, status_code: int = 200, message: str | None = None) -> dict[str, Any]:
    if isinstance(payload, dict):
        blockers = payload.get("blockers") or payload.get("errors") or []
        if not isinstance(blockers, list):
            blockers = [str(blockers)]
        success = payload.get("success")
        if success is None:
            success = status_code < 400 and not blockers
        return {
            "success": bool(success),
            "data": payload.get("data", payload),
            "blockers": blockers,
            "statusCode": int(payload.get("statusCode", status_code) or status_code),
            "message": str(payload.get("message") or message or "ok"),
        }
    return {"success": status_code < 400, "data": payload, "blockers": [], "statusCode": status_code, "message": message or "ok"}


class InternalHttpClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._timeout = httpx.Timeout(settings.REQUEST_TIMEOUT_SECONDS)
        self._retries = settings.REQUEST_RETRY_COUNT

    def _headers(self, *, actor_id: str | None = None, request_id: str | None = None, internal: bool = True) -> dict[str, str]:
        settings = get_settings()
        headers = {
            "x-caller-service": "dbaronx-telegram-bot",
            "x-caller-surface": "telegram",
            "x-correlation-id": request_id or str(uuid.uuid4()),
        }
        if internal and settings.INTERNAL_SERVICE_TOKEN:
            headers["x-internal-token"] = settings.INTERNAL_SERVICE_TOKEN
        if actor_id:
            headers["x-actor-id"] = actor_id
        if request_id:
            headers["x-request-id"] = request_id
        return headers

    async def get(
        self,
        base_url: str,
        path: str,
        *,
        actor_id: str | None = None,
        request_id: str | None = None,
        params: dict[str, Any] | None = None,
        internal: bool = True,
    ) -> dict[str, Any]:
        attempts = max(1, self._retries + 1)
        last_error: Exception | None = None
        for attempt in range(attempts):
            try:
                async with httpx.AsyncClient(timeout=self._timeout, base_url=base_url) as client:
                    response = await client.get(path, headers=self._headers(actor_id=actor_id, request_id=request_id, internal=internal), params=params)
                    payload = response.json() if response.content else {}
                    if response.status_code >= 500 and attempt + 1 < attempts:
                        await asyncio.sleep(0.2 * (attempt + 1))
                        continue
                    return normalize_response(payload, status_code=response.status_code, message=response.reason_phrase)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                if attempt + 1 < attempts:
                    await asyncio.sleep(0.2 * (attempt + 1))
                    continue
        return self._error_response(last_error or RuntimeError("request_failed"))

    async def post(
        self,
        base_url: str,
        path: str,
        *,
        json_body: dict[str, Any],
        actor_id: str | None = None,
        request_id: str | None = None,
        internal: bool = True,
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout, base_url=base_url) as client:
                response = await client.post(path, json=sanitize_value(json_body), headers=self._headers(actor_id=actor_id, request_id=request_id, internal=internal))
                payload = response.json() if response.content else {}
                return normalize_response(payload, status_code=response.status_code, message=response.reason_phrase)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            return self._error_response(exc)

    def _error_response(self, exc: Exception) -> dict[str, Any]:
        safe = sanitize_value({"error": exc.__class__.__name__, "message": str(exc)})
        logger.warning("backend_request_failed %s", safe)
        return {"success": False, "data": {}, "blockers": ["backend_request_failed"], "statusCode": 0, "message": safe.get("error", "request_failed")}
