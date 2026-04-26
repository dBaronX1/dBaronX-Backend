from __future__ import annotations

from typing import Any

from app.services.device_fingerprint_service import DeviceFingerprintService
from app.services.ip_reputation_service import IpReputationService
from app.services.watch_session_anomaly_service import WatchSessionAnomalyService


class TelemetryIntegrityService:
    """
    High-value canonical integrity aggregator.

    This is the contract layer FastAPI exposes back to NestJS for:
    - watch-to-earn telemetry integrity
    - affiliate event integrity
    - low-bandwidth fraud decision packaging
    """

    def __init__(
        self,
        *,
        device_fingerprint_service: DeviceFingerprintService | None = None,
        ip_reputation_service: IpReputationService | None = None,
        watch_session_anomaly_service: WatchSessionAnomalyService | None = None,
    ) -> None:
        self.device_fingerprint_service = (
            device_fingerprint_service or DeviceFingerprintService()
        )
        self.ip_reputation_service = ip_reputation_service or IpReputationService()
        self.watch_session_anomaly_service = (
            watch_session_anomaly_service or WatchSessionAnomalyService()
        )

    def evaluate_watch_integrity(
        self,
        *,
        session_id: str,
        headers: dict[str, Any],
        ip: str,
        account_id: str | None,
        declared_duration_seconds: int,
        heartbeat_intervals_ms: list[int],
        total_heartbeats: int,
        hidden_event_count: int = 0,
        blur_event_count: int = 0,
        seek_event_count: int = 0,
        playback_rate_max: float = 1.0,
        muted_ratio: float = 0.0,
        duplicate_claim_attempts: int = 0,
        recent_ip_events: list[dict[str, Any]] | None = None,
        distinct_accounts_24h: int = 0,
        failed_captcha_1h: int = 0,
        denied_watch_claims_24h: int = 0,
    ) -> dict[str, Any]:
        fingerprint = self.device_fingerprint_service.build(
            headers=headers,
            ip=ip,
            account_id=account_id,
            fingerprint_seed=session_id,
        )
        ip_reputation = self.ip_reputation_service.assess(
            ip=ip,
            recent_events=recent_ip_events,
            distinct_accounts_24h=distinct_accounts_24h,
            failed_captcha_1h=failed_captcha_1h,
            denied_watch_claims_24h=denied_watch_claims_24h,
        )
        session_anomaly = self.watch_session_anomaly_service.evaluate(
            session_id=session_id,
            declared_duration_seconds=declared_duration_seconds,
            heartbeat_intervals_ms=heartbeat_intervals_ms,
            total_heartbeats=total_heartbeats,
            hidden_event_count=hidden_event_count,
            blur_event_count=blur_event_count,
            seek_event_count=seek_event_count,
            playback_rate_max=playback_rate_max,
            muted_ratio=muted_ratio,
            duplicate_claim_attempts=duplicate_claim_attempts,
        )

        composite_score = min(
            100.0,
            round(
                fingerprint["fingerprint"]["stability_score"] * -0.12
                + ip_reputation["ip_reputation"]["risk_score"] * 0.46
                + session_anomaly["session_anomaly"]["risk_score"] * 0.66
                + 12.0,
                2,
            ),
        )
        composite_score = max(0.0, composite_score)

        allow = composite_score < 48.0 and session_anomaly["session_anomaly"]["allow"]
        decision = self._decision(composite_score)

        return {
            "success": True,
            "integrity": {
                "allow": allow,
                "decision": decision,
                "composite_risk_score": composite_score,
                "fingerprint": fingerprint["fingerprint"],
                "ip_reputation": ip_reputation["ip_reputation"],
                "session_anomaly": session_anomaly["session_anomaly"],
            },
        }

    def _decision(self, score: float) -> str:
        if score >= 70:
            return "deny"
        if score >= 48:
            return "review"
        return "allow"
