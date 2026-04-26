from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class RootLivenessService:
    """
    Canonical liveness surface.

    Strictly process-level and intentionally minimal.
    It must remain cheap enough for aggressive health polling.
    """

    def build(self) -> dict[str, Any]:
        return {
            "success": True,
            "liveness": {
                "alive": True,
                "service": "dbaronx-fastapi-intelligence",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }
