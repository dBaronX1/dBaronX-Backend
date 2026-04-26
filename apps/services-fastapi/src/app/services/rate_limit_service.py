from __future__ import annotations

from dataclasses import dataclass

from app.services.redis_service import RedisService


@dataclass(slots=True)
class RateLimitDecision:
    allowed: bool
    key: str
    count: int
    limit: int
    window_seconds: int
    remaining: int


class RateLimitService:
    """
    Canonical subsystem-safe limiter.

    Used across:
    - ads/watch attempts
    - captcha verification
    - AI generation
    - affiliate abuse surfaces
    - internal admin endpoints if needed
    """

    def __init__(self, *, redis: RedisService) -> None:
        self.redis = redis

    async def check(
        self,
        *,
        namespace: str,
        identifier: str,
        limit: int,
        window_seconds: int,
    ) -> RateLimitDecision:
        key = f"ratelimit:{namespace}:{identifier}"
        count = await self.redis.increment_counter(key, ttl_seconds=window_seconds)
        allowed = count <= limit

        return RateLimitDecision(
            allowed=allowed,
            key=key,
            count=count,
            limit=limit,
            window_seconds=window_seconds,
            remaining=max(0, limit - count),
        )
