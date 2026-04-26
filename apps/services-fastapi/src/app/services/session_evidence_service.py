from __future__ import annotations

from typing import Any


class SessionEvidenceService:
    """
    Canonical evidence packager for NestJS <-> FastAPI risk exchange.

    Builds a normalized evidence summary without shipping oversized payloads.
    This keeps mobile bandwidth lower while preserving decision quality.
    """

    def build(self, payload: dict[str, Any]) -> dict[str, Any]:
        events = payload.get("events") or []
        heartbeats = payload.get("heartbeats") or []

        return {
            "session_id": payload.get("session_id"),
            "user_id": payload.get("user_id"),
            "ad_id": payload.get("ad_id"),
            "duration": int(payload.get("duration") or 0),
            "expected_duration": int(payload.get("expected_duration") or 0),
            "event_count": len(events),
            "heartbeat_count": len(heartbeats),
            "focus_loss_count": self._count_type(events, "focus_lost"),
            "resume_count": self._count_type(events, "resume"),
            "visibility_hidden_count": self._count_type(events, "hidden"),
            "playback_rate_changes": self._count_type(events, "playback_rate_changed"),
            "mute_toggle_count": self._count_type(events, "mute_toggled"),
        }

    def _count_type(self, events: list[dict[str, Any]], event_type: str) -> int:
        return sum(1 for event in events if str(event.get("type")) == event_type)
