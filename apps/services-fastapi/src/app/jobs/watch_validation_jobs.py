from __future__ import annotations

import asyncio
from contextlib import suppress

from app.core.logging import get_logger
from app.schemas.telemetry import WatchValidationRequest
from app.services.nestjs_client import NestJSClient
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService
from app.services.watch_validation_service import WatchValidationService

logger = get_logger("app.watch_validation_jobs")


class WatchValidationJobCoordinator:
    def __init__(
        self,
        *,
        redis: RedisService,
        supabase: SupabaseService,
        nestjs: NestJSClient,
        queue_name: str = "watch-validation",
    ) -> None:
        self.redis = redis
        self.supabase = supabase
        self.nestjs = nestjs
        self.queue_name = queue_name
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._run(), name="watch-validation-jobs")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    async def enqueue(self, payload: dict) -> None:
        if not self.redis.is_configured:
            return
        await self.redis.push_json_list(f"queue:{self.queue_name}", payload)

    async def _run(self) -> None:
        while self._running:
            try:
                handled = await self._execute_once()
                if not handled:
                    await asyncio.sleep(1.0)
            except Exception as exc:
                logger.warning(
                    "Watch validation job cycle failed",
                    extra={"error": str(exc)},
                )
                await asyncio.sleep(2.0)

    async def _execute_once(self) -> bool:
        if not self.redis.is_configured:
            return False

        item = await self.redis.pop_json_list(f"queue:{self.queue_name}", max_items=1)
        if not item:
            return False

        payload = item[0]
        service = WatchValidationService(
            redis=self.redis,
            supabase=self.supabase,
            nestjs=self.nestjs,
        )

        request = WatchValidationRequest.model_validate(payload)
        await service.validate(request)

        return True
