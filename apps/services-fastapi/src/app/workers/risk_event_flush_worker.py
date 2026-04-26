from __future__ import annotations

import asyncio
from contextlib import suppress

from app.core.logging import get_logger
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService

logger = get_logger("app.risk_event_flush_worker")


class RiskEventFlushWorker:
    def __init__(
        self,
        *,
        redis: RedisService,
        supabase: SupabaseService,
        interval_seconds: int = 60,
    ) -> None:
        self.redis = redis
        self.supabase = supabase
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._run(), name="risk-event-flush-worker")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    async def _run(self) -> None:
        while self._running:
            try:
                await self.execute_once()
            except Exception as exc:
                logger.warning(
                    "Risk event flush cycle failed",
                    extra={"error": str(exc)},
                )
            await asyncio.sleep(self.interval_seconds)

    async def execute_once(self) -> None:
        if not self.redis.is_configured:
            return

        items = await self.redis.pop_json_list("risk:event:buffer", max_items=100)
        if not items:
            return

        for item in items:
            try:
                await self.supabase.insert_risk_event(item)
            except Exception as exc:
                logger.warning(
                    "Failed to flush buffered risk event",
                    extra={"error": str(exc), "item": item},
                )
