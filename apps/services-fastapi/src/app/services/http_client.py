from __future__ import annotations

from typing import Any

import httpx
from tenacity import AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_fixed

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger("app.http_client")


class DBXHttpClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.settings.request_timeout_seconds),
            follow_redirects=False,
            headers={
                "User-Agent": f"{self.settings.app_name}/{self.settings.app_version}",
                "Content-Type": "application/json",
            },
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def get(
        self,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        retry_attempts: int = 2,
    ) -> httpx.Response:
        return await self._request(
            "GET",
            url,
            params=params,
            headers=headers,
            retry_attempts=retry_attempts,
        )

    async def post(
        self,
        url: str,
        *,
        json: dict[str, Any] | list[Any] | None = None,
        headers: dict[str, str] | None = None,
        retry_attempts: int = 2,
    ) -> httpx.Response:
        return await self._request(
            "POST",
            url,
            json=json,
            headers=headers,
            retry_attempts=retry_attempts,
        )

    async def put(
        self,
        url: str,
        *,
        json: dict[str, Any] | list[Any] | None = None,
        headers: dict[str, str] | None = None,
        retry_attempts: int = 2,
    ) -> httpx.Response:
        return await self._request(
            "PUT",
            url,
            json=json,
            headers=headers,
            retry_attempts=retry_attempts,
        )

    async def delete(
        self,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        retry_attempts: int = 1,
    ) -> httpx.Response:
        return await self._request(
            "DELETE",
            url,
            headers=headers,
            retry_attempts=retry_attempts,
        )

    async def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | list[Any] | None = None,
        headers: dict[str, str] | None = None,
        retry_attempts: int = 2,
    ) -> httpx.Response:
        merged_headers = dict(self._client.headers)
        if headers:
            merged_headers.update(headers)

        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(max(1, retry_attempts)),
            wait=wait_fixed(0.35),
            retry=retry_if_exception_type(
                (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError)
            ),
            reraise=True,
        ):
            with attempt:
                response = await self._client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    headers=merged_headers,
                )
                logger.info(
                    "Outgoing HTTP request completed",
                    extra={
                        "method": method,
                        "url": url,
                        "status_code": response.status_code,
                    },
                )
                return response

        raise RuntimeError("HTTP request retry loop exhausted unexpectedly")
