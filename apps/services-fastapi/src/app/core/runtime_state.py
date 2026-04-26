from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(slots=True)
class RuntimeState:
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    redis_connected: bool = False
    supabase_reachable: bool = False
    nestjs_reachable: bool = False
    background_workers_started: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)

    def mark_started(self, **kwargs: Any) -> None:
        self.started_at = datetime.now(timezone.utc)
        self.metadata.update(kwargs)

    def uptime_seconds(self) -> float:
        return max(
            0.0,
            (datetime.now(timezone.utc) - self.started_at).total_seconds(),
        )
