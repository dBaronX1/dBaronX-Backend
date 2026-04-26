from __future__ import annotations

from collections.abc import Iterable
from typing import Any


class RiskSignalService:
    """
    Converts raw behavior inputs into stable risk signals consumed by scoring.

    This keeps route handlers thin and prevents subsystem-local scoring drift.
    """

    @staticmethod
    def normalize_user_agent(user_agent: str | None) -> str:
        return (user_agent or "").strip().lower()

    def suspicious_user_agent(self, user_agent: str | None) -> bool:
        normalized = self.normalize_user_agent(user_agent)
        blocked_markers = (
            "sqlmap",
            "nikto",
            "curl/",
            "python-requests",
            "scrapy",
            "headless",
            "phantomjs",
        )
        return any(marker in normalized for marker in blocked_markers)

    @staticmethod
    def high_playback_rate(playback_rate_max: float | None) -> bool:
        return playback_rate_max is not None and playback_rate_max > 2.0

    @staticmethod
    def insufficient_visible_heartbeats(
        *,
        visible_heartbeat_count: int,
        duration_seconds: int,
        minimum_ratio: float = 0.5,
    ) -> bool:
        if duration_seconds <= 0:
            return True
        expected_minimum = max(1, int(duration_seconds * minimum_ratio))
        return visible_heartbeat_count < expected_minimum

    @staticmethod
    def hidden_heartbeat_dominance(
        *,
        visible_heartbeat_count: int,
        hidden_heartbeat_count: int,
    ) -> bool:
        return hidden_heartbeat_count > visible_heartbeat_count

    @staticmethod
    def repeated_fingerprint(
        *,
        fingerprint_count: int,
        threshold: int = 6,
    ) -> bool:
        return fingerprint_count >= threshold

    @staticmethod
    def velocity_exceeded(
        *,
        attempt_count: int,
        threshold: int,
    ) -> bool:
        return attempt_count > threshold

    @staticmethod
    def duplicate_ip_cluster(
        *,
        ip_user_count: int,
        threshold: int = 8,
    ) -> bool:
        return ip_user_count >= threshold

    @staticmethod
    def summarize_flags(flags: Iterable[tuple[str, bool]]) -> dict[str, bool]:
        return {name: enabled for name, enabled in flags}
