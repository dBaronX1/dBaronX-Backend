from __future__ import annotations

from typing import Any

from app.services.account_trust_profile_service import AccountTrustProfileService
from app.services.telemetry_integrity_service import TelemetryIntegrityService


class W2ERewardDecisionService:
    """
    Canonical watch-to-earn reward decision engine.

    This is the high-value contract NestJS can call before crediting rewards.
    It fuses:
    - telemetry integrity
    - account trust
    - campaign/session behavioral signals

    Output is intentionally compact and deterministic.
    """

    def __init__(
        self,
        *,
        telemetry_integrity_service: TelemetryIntegrityService | None = None,
        account_trust_profile_service: AccountTrustProfileService | None = None,
    ) -> None:
        self.telemetry_integrity_service = (
            telemetry_integrity_service or TelemetryIntegrityService()
        )
        self.account_trust_profile_service = (
            account_trust_profile_service or AccountTrustProfileService()
        )

    def decide(
        self,
        *,
        session_id: str,
        account_id: str,
        headers: dict[str, Any],
        ip: str,
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
        account_age_days: int = 0,
        email_verified: bool = False,
        phone_verified: bool = False,
        completed_orders: int = 0,
        successful_watches_30d: int = 0,
        denied_watches_30d: int = 0,
        affiliate_payout_rejections_180d: int = 0,
        chargebacks_365d: int = 0,
        policy_flags_180d: int = 0,
        device_count_30d: int = 1,
    ) -> dict[str, Any]:
        telemetry = self.telemetry_integrity_service.evaluate_watch_integrity(
            session_id=session_id,
            headers=headers,
            ip=ip,
            account_id=account_id,
            declared_duration_seconds=declared_duration_seconds,
            heartbeat_intervals_ms=heartbeat_intervals_ms,
            total_heartbeats=total_heartbeats,
            hidden_event_count=hidden_event_count,
            blur_event_count=blur_event_count,
            seek_event_count=seek_event_count,
            playback_rate_max=playback_rate_max,
            muted_ratio=muted_ratio,
            duplicate_claim_attempts=duplicate_claim_attempts,
            recent_ip_events=recent_ip_events,
            distinct_accounts_24h=distinct_accounts_24h,
            failed_captcha_1h=failed_captcha_1h,
            denied_watch_claims_24h=denied_watch_claims_24h,
        )
        trust = self.account_trust_profile_service.evaluate(
            account_id=account_id,
            account_age_days=account_age_days,
            email_verified=email_verified,
            phone_verified=phone_verified,
            completed_orders=completed_orders,
            successful_watches_30d=successful_watches_30d,
            denied_watches_30d=denied_watches_30d,
            affiliate_payout_rejections_180d=affiliate_payout_rejections_180d,
            chargebacks_365d=chargebacks_365d,
            policy_flags_180d=policy_flags_180d,
            device_count_30d=device_count_30d,
        )

        telemetry_score = float(telemetry["integrity"]["composite_risk_score"])
        trust_score = float(trust["account_trust"]["trust_score"])

        decision_score = round(
            max(
                0.0,
                min(
                    100.0,
                    telemetry_score * 0.72 + (100.0 - trust_score) * 0.28,
                ),
            ),
            2,
        )

        decision = self._decision(decision_score)
        allow = decision == "allow"

        reasons: list[str] = []
        if telemetry["integrity"]["decision"] != "allow":
            reasons.append("telemetry_integrity_risk")
        if trust["account_trust"]["trust_band"] == "low":
            reasons.append("low_account_trust")
        if duplicate_claim_attempts >= 1:
            reasons.append("duplicate_claim_attempts")
        if denied_watch_claims_24h >= 3:
            reasons.append("recent_watch_denials")

        return {
            "success": True,
            "reward_decision": {
                "allow": allow,
                "decision": decision,
                "decision_score": decision_score,
                "telemetry": telemetry["integrity"],
                "trust": trust["account_trust"],
                "reasons": reasons,
            },
        }

    def _decision(self, score: float) -> str:
        if score >= 68:
            return "deny"
        if score >= 42:
            return "review"
        return "allow"
