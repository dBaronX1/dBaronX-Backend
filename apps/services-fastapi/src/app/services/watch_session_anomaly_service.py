from __future__ import annotations

from typing import Any


class WatchSessionAnomalyService:
    """
    Canonical anomaly detector for watch-to-earn telemetry.

    Evaluates:
    - heartbeat gaps
    - impossible durations
    - hidden/blur-heavy sessions
    - speed/mute anomalies
    - double-submit risk
    """

    def evaluate(
        self,
        *,
        session_id: str,
        declared_duration_seconds: int,
        heartbeat_intervals_ms: list[int],
        total_heartbeats: int,
        hidden_event_count: int = 0,
        blur_event_count: int = 0,
        seek_event_count: int = 0,
        playback_rate_max: float = 1.0,
        muted_ratio: float = 0.0,
        duplicate_claim_attempts: int = 0,
    ) -> dict[str, Any]:
        safe_session_id = self._require(session_id, "session_id")
        safe_duration = max(1, int(declared_duration_seconds))
        total_heartbeats = max(0, int(total_heartbeats))

        expected_heartbeats = max(1, safe_duration // 5)
        coverage_ratio = total_heartbeats / max(expected_heartbeats, 1)

        long_gap_count = len([gap for gap in heartbeat_intervals_ms if gap > 12000])
        huge_gap_count = len([gap for gap in heartbeat_intervals_ms if gap > 25000])

        risk_score = 0.0
        reasons: list[str] = []

        if coverage_ratio < 0.6:
            risk_score += 24.0
            reasons.append("low_heartbeat_coverage")
        elif coverage_ratio < 0.85:
            risk_score += 10.0
            reasons.append("partial_heartbeat_coverage")

        if long_gap_count >= 2:
            risk_score += min(18.0, long_gap_count * 4.0)
            reasons.append("heartbeat_gaps")

        if huge_gap_count >= 1:
            risk_score += min(16.0, huge_gap_count * 8.0)
            reasons.append("huge_heartbeat_gap")

        if hidden_event_count >= 3:
            risk_score += min(14.0, hidden_event_count * 2.5)
            reasons.append("tab_hidden_behavior")

        if blur_event_count >= 4:
            risk_score += min(12.0, blur_event_count * 2.0)
            reasons.append("blur_heavy_session")

        if seek_event_count >= 2:
            risk_score += min(14.0, seek_event_count * 4.0)
            reasons.append("seek_behavior")

        if playback_rate_max > 1.15:
            risk_score += 18.0
            reasons.append("high_playback_rate")

        if muted_ratio >= 0.95:
            risk_score += 7.0
            reasons.append("fully_muted_session")

        if duplicate_claim_attempts >= 1:
            risk_score += min(20.0, duplicate_claim_attempts * 8.0)
            reasons.append("duplicate_claim_attempts")

        level = self._level(risk_score)

        return {
            "success": True,
            "session_anomaly": {
                "session_id": safe_session_id,
                "risk_score": round(min(100.0, risk_score), 2),
                "risk_level": level,
                "allow": risk_score < 45.0,
                "signals": {
                    "declared_duration_seconds": safe_duration,
                    "expected_heartbeats": expected_heartbeats,
                    "total_heartbeats": total_heartbeats,
                    "coverage_ratio": round(coverage_ratio, 3),
                    "long_gap_count": long_gap_count,
                    "huge_gap_count": huge_gap_count,
                    "hidden_event_count": hidden_event_count,
                    "blur_event_count": blur_event_count,
                    "seek_event_count": seek_event_count,
                    "playback_rate_max": playback_rate_max,
                    "muted_ratio": muted_ratio,
                    "duplicate_claim_attempts": duplicate_claim_attempts,
                },
                "reasons": reasons,
            },
        }

    def _level(self, score: float) -> str:
        if score >= 65:
            return "high"
        if score >= 35:
            return "medium"
        return "low"

    def _require(self, value: str, field_name: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
