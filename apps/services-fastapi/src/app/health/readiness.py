from __future__ import annotations

import os
import platform
import time
from dataclasses import dataclass, field
from typing import Any


_BOOT_TIME = time.time()


@dataclass
class ReadinessCheck:
    name: str
    ok: bool
    latency_ms: float | None = None
    details: dict[str, Any] = field(default_factory=dict)


class ReadinessService:
    async def check(self) -> dict[str, Any]:
        checks = [
            self._environment_check(),
            self._internal_token_check(),
            self._memory_check(),
        ]

        ok = all(check.ok for check in checks)

        return {
            "success": ok,
            "service": os.getenv("SERVICE_NAME", "dbaronx-fastapi"),
            "status": "ready" if ok else "not_ready",
            "uptimeSeconds": round(time.time() - _BOOT_TIME, 2),
            "version": os.getenv("APP_VERSION", "1.0.0"),
            "runtime": {
                "python": platform.python_version(),
                "platform": platform.platform(),
            },
            "checks": [check.__dict__ for check in checks],
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    def _environment_check(self) -> ReadinessCheck:
        env = (
            os.getenv("APP_ENV")
            or os.getenv("ENVIRONMENT")
            or os.getenv("NODE_ENV")
            or "development"
        ).lower()

        return ReadinessCheck(
            name="environment",
            ok=env in {"development", "test", "staging", "production"},
            details={"environment": env},
        )

    def _internal_token_check(self) -> ReadinessCheck:
        token = os.getenv("INTERNAL_SERVICE_TOKEN") or os.getenv("FASTAPI_INTERNAL_SERVICE_TOKEN") or ""
        production = (
            os.getenv("APP_ENV")
            or os.getenv("ENVIRONMENT")
            or os.getenv("NODE_ENV")
            or "development"
        ).lower() == "production"

        return ReadinessCheck(
            name="internal_service_token",
            ok=bool(token) and (not production or len(token) >= 20),
            details={
                "configured": bool(token),
                "productionLengthOk": not production or len(token) >= 20,
            },
        )

    def _memory_check(self) -> ReadinessCheck:
        try:
            import resource

            usage_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            return ReadinessCheck(
                name="memory",
                ok=True,
                details={"maxRssKb": usage_kb},
            )
        except Exception:
            return ReadinessCheck(
                name="memory",
                ok=True,
                details={"available": False},
            )