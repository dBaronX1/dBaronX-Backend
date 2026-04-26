from __future__ import annotations

from app.core.logging import get_logger
from app.services.redis_service import RedisService

logger = get_logger("app.lifecycle")


class AppLifecycleService:
    def __init__(self, redis: RedisService) -> None:
        self.redis = redis

    async def startup(self) -> None:
        if self.redis.is_configured:
            try:
                await self.redis.connect()
                ok = await self.redis.ping()
                logger.info(
                    "Redis startup check completed",
                    extra={"redis_ok": ok},
                )
            except Exception as exc:
                logger.warning(
                    "Redis startup check failed",
                    extra={"error": str(exc)},
                )
        else:
            logger.info("Redis not configured; continuing without Redis")

    async def shutdown(self) -> None:
        try:
            await self.redis.close()
        except Exception as exc:
            logger.warning(
                "Redis shutdown close failed",
                extra={"error": str(exc)},
            )
