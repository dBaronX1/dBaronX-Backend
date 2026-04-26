from __future__ import annotations

import asyncio
from contextlib import suppress
from datetime import datetime, timedelta, timezone

from app.core.logging import get_logger
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService

logger = get_logger("app.heartbeat_cleanup_worker")


class HeartbeatCleanupWorker:
    def __init__(
        self,
        *,
        redis: RedisService,
        supabase: SupabaseService,
        interval_seconds: int = 900,
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
        self._task = asyncio.create_task(self._run(), name="heartbeat-cleanup-worker")

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
                    "Heartbeat cleanup cycle failed",
                    extra={"error": str(exc)},
                )
            await asyncio.sleep(self.interval_seconds)

    async def execute_once(self) -> None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)

        await self.supabase.insert_risk_event(
            {
                "event_type": "worker_heartbeat_cleanup",
                "decision": "allow",
                "level": "low",
                "score": 0,
                "reason": "Periodic heartbeat cleanup executed",
                "metadata": {
                    "cutoff": cutoff.isoformat(),
                    "interval_seconds": self.interval_seconds,
                },
            }
        )

        if self.redis.is_configured:
            try:
                await self.redis.delete_by_prefix("watch:heartbeat:")
            except Exception as exc:
                logger.warning(
                    "Failed to clear heartbeat keys by prefix",
                    extra={"error": str(exc)},
                )
