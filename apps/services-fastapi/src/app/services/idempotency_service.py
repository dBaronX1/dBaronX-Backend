from __future__ import annotations

import hashlib
import json
from typing import Any

from app.services.redis_service import RedisService


class IdempotencyService:
    """
    Cross-subsystem idempotency gate for:
    - checkout risk scoring
    - watch-to-earn settlement preparation
    - AI generation deduplication
    - affiliate event processing
    - internal admin actions

    This service is intentionally subsystem-agnostic.
    """

    def __init__(self, *, redis: RedisService) -> None:
        self.redis = redis

    @staticmethod
    def build_key(namespace: str, payload: dict[str, Any]) -> str:
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return f"idempotency:{namespace}:{digest}"

    async def get_result(self, key: str) -> dict[str, Any] | None:
        cached = await self.redis.get_json(key)
        if isinstance(cached, dict):
            return cached
        return None

    async def store_result(
        self,
        *,
        key: str,
        result: dict[str, Any],
        ttl_seconds: int = 60 * 30,
    ) -> None:
        await self.redis.set_json(key, result, ttl_seconds=ttl_seconds)

    async def execute(
        self,
        *,
        namespace: str,
        payload: dict[str, Any],
        ttl_seconds: int,
        compute,
    ) -> dict[str, Any]:
        key = self.build_key(namespace, payload)
        cached = await self.get_result(key)
        if cached is not None:
            return {
                "success": True,
                "deduplicated": True,
                "key": key,
                "result": cached,
            }

        result = await compute()
        await self.store_result(key=key, result=result, ttl_seconds=ttl_seconds)

        return {
            "success": True,
            "deduplicated": False,
            "key": key,
            "result": result,
        }
