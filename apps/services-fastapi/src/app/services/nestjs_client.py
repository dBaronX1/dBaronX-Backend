from __future__ import annotations

from typing import Any

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.services.http_client import DBXHttpClient

logger = get_logger("app.nestjs_client")


class NestJSClient:
    def __init__(
        self,
        http_client: DBXHttpClient | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.http = http_client or DBXHttpClient(self.settings)

    @property
    def base_url(self) -> str:
        return str(self.settings.nestjs_base_url).rstrip("/")

    @property
    def headers(self) -> dict[str, str]:
        return {
            "x-internal-token": self.settings.internal_service_token,
            "x-service-name": self.settings.app_name,
        }

    async def close(self) -> None:
        await self.http.close()

    async def health(self) -> dict[str, Any]:
        response = await self.http.get(
            f"{self.base_url}/health/live",
            headers=self.headers,
            retry_attempts=1,
        )
        return {
            "ok": 200 <= response.status_code < 300,
            "source": "nestjs",
            "status_code": response.status_code,
        }

    async def notify_watch_validation_result(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Best-effort callback into NestJS.
        NestJS may choose to store analytics, reward events, or review queue events.
        """
        try:
            response = await self.http.post(
                f"{self.base_url}/api/v1/internal/watch-validation-events",
                json=payload,
                headers=self.headers,
                retry_attempts=2,
            )
            body: dict[str, Any]
            try:
                body = response.json()
            except Exception:
                body = {"raw": response.text}
            return {
                "ok": 200 <= response.status_code < 300,
                "status_code": response.status_code,
                "body": body,
            }
        except Exception as exc:
            logger.warning(
                "Failed to notify NestJS watch validation result",
                extra={"error": str(exc)},
            )
            return {
                "ok": False,
                "status_code": None,
                "body": {"error": str(exc)},
            }

    async def notify_ai_generation_result(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            response = await self.http.post(
                f"{self.base_url}/api/v1/internal/ai-generation-events",
                json=payload,
                headers=self.headers,
                retry_attempts=2,
            )
            body: dict[str, Any]
            try:
                body = response.json()
            except Exception:
                body = {"raw": response.text}
            return {
                "ok": 200 <= response.status_code < 300,
                "status_code": response.status_code,
                "body": body,
            }
        except Exception as exc:
            logger.warning(
                "Failed to notify NestJS AI generation result",
                extra={"error": str(exc)},
            )
            return {
                "ok": False,
                "status_code": None,
                "body": {"error": str(exc)},
            }
