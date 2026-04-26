from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class RateLimitDecision:
    allowed: bool
    key: str
    limit: int
    remaining: int
    reset_at: float
    retry_after_seconds: int


class DbxRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, tuple[int, float]] = {}

    def consume(self, key: str, *, limit: int = 120, window_seconds: int = 60) -> RateLimitDecision:
        now = time.time()
        count, reset_at = self._buckets.get(key, (0, now + window_seconds))

        if now >= reset_at:
            count = 0
            reset_at = now + window_seconds

        count += 1
        self._buckets[key] = (count, reset_at)

        allowed = count <= limit
        remaining = max(0, limit - count)
        retry_after = max(1, int(reset_at - now))

        if len(self._buckets) > 10_000:
            self.cleanup()

        return RateLimitDecision(
            allowed=allowed,
            key=key,
            limit=limit,
            remaining=remaining,
            reset_at=reset_at,
            retry_after_seconds=retry_after,
        )

    def cleanup(self) -> int:
        now = time.time()
        removed = 0

        for key, (_count, reset_at) in list(self._buckets.items()):
            if now >= reset_at:
                del self._buckets[key]
                removed += 1

        return removed


dbx_rate_limiter = DbxRateLimiter()