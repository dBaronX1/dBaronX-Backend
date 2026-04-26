from __future__ import annotations

import json
from typing import Any

from redis.asyncio import Redis
from redis.asyncio.client import Pipeline

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger("app.redis")


class RedisService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: Redis | None = None

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.redis_url)

    async def connect(self) -> None:
        if not self.is_configured or self._client is not None:
            return

        self._client = Redis.from_url(
            self.settings.redis_url,  # type: ignore[arg-type]
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            health_check_interval=30,
        )
        logger.info("Redis client initialized")

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None

    async def ping(self) -> bool:
        if not self.is_configured:
            return False
        await self.connect()
        assert self._client is not None
        try:
            return bool(await self._client.ping())
        except Exception:
            return False

    async def get_json(self, key: str) -> Any | None:
        if not self.is_configured:
            return None
        await self.connect()
        assert self._client is not None

        raw = await self._client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set_json(self, key: str, value: Any, ttl_seconds: int | None = None) -> bool:
        if not self.is_configured:
            return False
        await self.connect()
        assert self._client is not None

        payload = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
        result = await self._client.set(key, payload, ex=ttl_seconds)
        return bool(result)

    async def delete(self, key: str) -> int:
        if not self.is_configured:
            return 0
        await self.connect()
        assert self._client is not None
        return int(await self._client.delete(key))

    async def increment_with_ttl(self, key: str, ttl_seconds: int) -> int:
        if not self.is_configured:
            return 1

        await self.connect()
        assert self._client is not None

        async with self._client.pipeline(transaction=True) as pipe:
            pipe = pipe  # type: Pipeline[str]
            pipe.incr(key)
            pipe.expire(key, ttl_seconds)
            result = await pipe.execute()

        return int(result[0])

    async def set_if_not_exists(self, key: str, value: str, ttl_seconds: int) -> bool:
        if not self.is_configured:
            return False
        await self.connect()
        assert self._client is not None
        result = await self._client.set(key, value, ex=ttl_seconds, nx=True)
        return bool(result)

    async def acquire_lock(self, key: str, ttl_seconds: int = 10) -> bool:
        return await self.set_if_not_exists(f"lock:{key}", "1", ttl_seconds)

    async def release_lock(self, key: str) -> int:
        return await self.delete(f"lock:{key}")
