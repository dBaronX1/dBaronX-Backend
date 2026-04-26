from __future__ import annotations

from datetime import UTC, datetime

from apps.services_fastapi.src.modules.watch.schemas.session_validation_contracts import (
    CompiledFraudSignal,
    FraudEventType,
    RiskLevel,
    SessionAnomalyReport,
    TelemetryIntegrityGrade,
    WatchSessionAggregate,
)


class SessionAnomalyCompiler:
    """
    Canonical telemetry evidence compiler for watch-session validation.

    This service does not persist or settle anything.
    It transforms raw aggregated watch evidence into deterministic,
    explainable fraud/risk signals that downstream validators and
    settlement services can rely on consistently.
    """

    def compile(self, aggregate: WatchSessionAggregate) -> SessionAnomalyReport:
        signals: list[CompiledFraudSignal] = []
        metrics = self._derive_metrics(aggregate)

        self._check_duplicate_reward_patterns(aggregate, metrics, signals)
        self._check_concurrency_patterns(aggregate, metrics, signals)
        self._check_heartbeat_integrity(aggregate, metrics, signals)
        self._check_completion_integrity(aggregate, metrics, signals)
        self._check_playback_integrity(aggregate, metrics, signals)
        self._check_focus_visibility_integrity(aggregate, metrics, signals)
        self._check_identity_integrity(aggregate, metrics, signals)
        self._check_captcha_integrity(aggregate, metrics, signals)

        total_penalty = round(sum(signal.penalty_score for signal in signals), 4)
        integrity_grade = self._resolve_integrity_grade(total_penalty, signals, metrics)

        return SessionAnomalyReport(
            session_id=aggregate.session_id,
            user_id=aggregate.user_id,
            ad_id=aggregate.ad_id,
            generated_at=datetime.now(UTC),
            integrity_grade=integrity_grade,
            signals=signals,
            total_penalty_score=total_penalty,
            derived_metrics=metrics,
        )

    def _derive_metrics(self, aggregate: WatchSessionAggregate) -> dict[str, float | int | bool]:
        observed_vs_media_ratio = (
            aggregate.observed_duration_seconds / aggregate.media_duration_seconds
            if aggregate.media_duration_seconds > 0
            else 0.0
        )
        declared_vs_observed_gap = abs(
            aggregate.declared_duration_seconds - aggregate.observed_duration_seconds,
        )
        heartbeat_coverage_ratio = (
            aggregate.heartbeat_count / aggregate.heartbeat_expected_count
            if aggregate.heartbeat_expected_count > 0
            else 0.0
        )
        hidden_ratio = (
            aggregate.visibility_hidden_seconds / aggregate.observed_duration_seconds
            if aggregate.observed_duration_seconds > 0
            else 0.0
        )

        return {
            "observed_vs_media_ratio": round(observed_vs_media_ratio, 6),
            "declared_vs_observed_gap_seconds": round(declared_vs_observed_gap, 6),
            "heartbeat_coverage_ratio": round(heartbeat_coverage_ratio, 6),
            "hidden_ratio": round(hidden_ratio, 6),
            "has_completed_media": aggregate.completion_ratio >= 0.98,
            "high_velocity_ip": aggregate.ip_session_count_15m >= 8,
            "high_velocity_fingerprint": aggregate.fingerprint_session_count_15m >= 6,
        }

    def _check_duplicate_reward_patterns(
        self,
        aggregate: WatchSessionAggregate,
        metrics: dict[str, float | int | bool],
        signals: list[CompiledFraudSignal],
    ) -> None:
        if aggregate.reward_count_same_ad_24h > 0:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.SESSION_DUPLICATE,
                    severity=95,
                    risk_level=RiskLevel.CRITICAL,
                    title="Duplicate same-ad reward attempt",
                    detail="The same user already has a rewarded session for this ad inside the policy window.",
                    evidence={
                        "reward_count_same_ad_24h": aggregate.reward_count_same_ad_24h,
                        "policy_window_hours": 24,
                    },
                    penalty_score=40,
                ),
            )

        if aggregate.duplicate_reward_attempts_24h >= 2:
            severity = 75 if aggregate.duplicate_reward_attempts_24h < 5 else 92
            level = RiskLevel.HIGH if severity < 90 else RiskLevel.CRITICAL
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.DUPLICATE_REWARD_ATTEMPT,
                    severity=severity,
                    risk_level=level,
                    title="Repeated duplicate reward behavior",
                    detail="The account has multiple duplicate reward attempts within the last 24 hours.",
                    evidence={
                        "duplicate_reward_attempts_24h": aggregate.duplicate_reward_attempts_24h,
                    },
                    penalty_score=22 if level == RiskLevel.HIGH else 35,
                ),
            )

    def _check_concurrency_patterns(
        self,
        aggregate: WatchSessionAggregate,
        metrics: dict[str, float | int | bool],
        signals: list[CompiledFraudSignal],
    ) -> None:
        if aggregate.concurrent_session_count >= 2:
            severity = min(100, 60 + (aggregate.concurrent_session_count * 8))
            level = RiskLevel.HIGH if aggregate.concurrent_session_count < 4 else RiskLevel.CRITICAL
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.SESSION_OVERLAP,
                    severity=severity,
                    risk_level=level,
                    title="Concurrent watch sessions detected",
                    detail="The same identity produced overlapping watch sessions that should not coexist for reward validation.",
                    evidence={
                        "concurrent_session_count": aggregate.concurrent_session_count,
                    },
                    penalty_score=18 + (aggregate.concurrent_session_count * 4),
                ),
            )

        if bool(metrics["high_velocity_ip"]):
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.IP_CLUSTER_RISK,
                    severity=68,
                    risk_level=RiskLevel.HIGH,
                    title="High IP session velocity",
                    detail="The source IP produced too many watch sessions in a short time window.",
                    evidence={
                        "ip_session_count_15m": aggregate.ip_session_count_15m,
                        "window_minutes": 15,
                    },
                    penalty_score=16,
                ),
            )

        if bool(metrics["high_velocity_fingerprint"]):
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.BOT_PATTERN,
                    severity=74,
                    risk_level=RiskLevel.HIGH,
                    title="High device fingerprint reuse velocity",
                    detail="The same device fingerprint produced an abnormal number of sessions in a short time window.",
                    evidence={
                        "fingerprint_session_count_15m": aggregate.fingerprint_session_count_15m,
                        "window_minutes": 15,
                    },
                    penalty_score=17,
                ),
            )

    def _check_heartbeat_integrity(
        self,
        aggregate: WatchSessionAggregate,
        metrics: dict[str, float | int | bool],
        signals: list[CompiledFraudSignal],
    ) -> None:
        coverage = float(metrics["heartbeat_coverage_ratio"])

        if aggregate.heartbeat_expected_count > 0 and coverage < 0.45:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.HEARTBEAT_SPARSE,
                    severity=82,
                    risk_level=RiskLevel.HIGH,
                    title="Heartbeat coverage too sparse",
                    detail="Observed heartbeat coverage is far below the minimum confidence threshold for reward validation.",
                    evidence={
                        "heartbeat_count": aggregate.heartbeat_count,
                        "heartbeat_expected_count": aggregate.heartbeat_expected_count,
                        "heartbeat_coverage_ratio": coverage,
                    },
                    penalty_score=24,
                ),
            )
        elif aggregate.heartbeat_expected_count > 0 and coverage < 0.7:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.HEARTBEAT_SPARSE,
                    severity=58,
                    risk_level=RiskLevel.MEDIUM,
                    title="Heartbeat coverage below preferred threshold",
                    detail="Observed heartbeat coverage is below preferred confidence levels and should reduce trust in the session.",
                    evidence={
                        "heartbeat_coverage_ratio": coverage,
                    },
                    penalty_score=9,
                ),
            )

        avg_gap = aggregate.average_heartbeat_gap_seconds or 0.0
        max_gap = aggregate.maximum_heartbeat_gap_seconds or 0.0

        if max_gap >= 45 or avg_gap >= 20:
            severity = 80 if max_gap >= 60 else 64
            level = RiskLevel.HIGH if severity >= 80 else RiskLevel.MEDIUM
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.SESSION_GAP_ANOMALY,
                    severity=severity,
                    risk_level=level,
                    title="Heartbeat gap anomaly",
                    detail="The watch session contains large telemetry gaps that weaken continuity evidence.",
                    evidence={
                        "average_heartbeat_gap_seconds": round(avg_gap, 4),
                        "maximum_heartbeat_gap_seconds": round(max_gap, 4),
                    },
                    penalty_score=14 if level == RiskLevel.HIGH else 6,
                ),
            )

    def _check_completion_integrity(
        self,
        aggregate: WatchSessionAggregate,
        metrics: dict[str, float | int | bool],
        signals: list[CompiledFraudSignal],
    ) -> None:
        ratio = float(metrics["observed_vs_media_ratio"])
        gap = float(metrics["declared_vs_observed_gap_seconds"])

        if aggregate.media_duration_seconds > 0 and ratio < 0.55:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.COMPLETION_TOO_FAST,
                    severity=90,
                    risk_level=RiskLevel.CRITICAL,
                    title="Observed duration too short for claimed completion",
                    detail="Observed session duration is too short relative to media duration to support a valid reward claim.",
                    evidence={
                        "observed_duration_seconds": aggregate.observed_duration_seconds,
                        "media_duration_seconds": aggregate.media_duration_seconds,
                        "observed_vs_media_ratio": ratio,
                    },
                    penalty_score=36,
                ),
            )
        elif aggregate.media_duration_seconds > 0 and ratio < 0.85:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.COMPLETION_TOO_FAST,
                    severity=62,
                    risk_level=RiskLevel.MEDIUM,
                    title="Observed duration lower than expected",
                    detail="Observed playback duration is materially lower than the media duration and should reduce reward confidence.",
                    evidence={"observed_vs_media_ratio": ratio},
                    penalty_score=10,
                ),
            )

        if gap >= 15:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.CLOCK_SKEW,
                    severity=56,
                    risk_level=RiskLevel.MEDIUM,
                    title="Declared and observed session durations diverge",
                    detail="Client-declared duration and observed server-side duration differ beyond tolerance.",
                    evidence={
                        "declared_duration_seconds": aggregate.declared_duration_seconds,
                        "observed_duration_seconds": aggregate.observed_duration_seconds,
                        "gap_seconds": gap,
                    },
                    penalty_score=8,
                ),
            )

    def _check_playback_integrity(
        self,
        aggregate: WatchSessionAggregate,
        metrics: dict[str, float | int | bool],
        signals: list[CompiledFraudSignal],
    ) -> None:
        rate_avg = aggregate.playback_rate_average or 1.0
        rate_max = aggregate.playback_rate_max or rate_avg

        if rate_max >= 2.5 or rate_avg >= 1.75:
            severity = 85 if rate_max >= 3 else 67
            level = RiskLevel.HIGH if severity >= 80 else RiskLevel.MEDIUM
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.PLAYBACK_RATE_ABUSE,
                    severity=severity,
                    risk_level=level,
                    title="Playback rate abuse suspected",
                    detail="Playback speed patterns exceed trusted watch-to-earn tolerances.",
                    evidence={
                        "playback_rate_average": round(rate_avg, 4),
                        "playback_rate_max": round(rate_max, 4),
                    },
                    penalty_score=20 if level == RiskLevel.HIGH else 8,
                ),
            )

        if aggregate.mute_ratio >= 0.98 and aggregate.completion_ratio >= 0.98:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.BOT_PATTERN,
                    severity=44,
                    risk_level=RiskLevel.MEDIUM,
                    title="Muted completion pattern",
                    detail="Session completed almost entirely muted; not blocking alone, but useful as pattern evidence.",
                    evidence={"mute_ratio": round(aggregate.mute_ratio, 4)},
                    penalty_score=4,
                ),
            )

    def _check_focus_visibility_integrity(
        self,
        aggregate: WatchSessionAggregate,
        metrics: dict[str, float | int | bool],
        signals: list[CompiledFraudSignal],
    ) -> None:
        hidden_ratio = float(metrics["hidden_ratio"])

        if hidden_ratio >= 0.7:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.FOCUS_LOSS_EXCESSIVE,
                    severity=72,
                    risk_level=RiskLevel.HIGH,
                    title="Excessive hidden-tab watch time",
                    detail="Most of the session occurred while the media was not visibly foregrounded.",
                    evidence={
                        "focus_loss_count": aggregate.focus_loss_count,
                        "visibility_hidden_seconds": aggregate.visibility_hidden_seconds,
                        "hidden_ratio": hidden_ratio,
                    },
                    penalty_score=15,
                ),
            )
        elif aggregate.focus_loss_count >= 6:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.FOCUS_LOSS_EXCESSIVE,
                    severity=48,
                    risk_level=RiskLevel.MEDIUM,
                    title="Frequent focus interruptions",
                    detail="The session repeatedly lost visibility/focus, weakening continuity confidence.",
                    evidence={"focus_loss_count": aggregate.focus_loss_count},
                    penalty_score=5,
                ),
            )

    def _check_identity_integrity(
        self,
        aggregate: WatchSessionAggregate,
        metrics: dict[str, float | int | bool],
        signals: list[CompiledFraudSignal],
    ) -> None:
        if not aggregate.fingerprint_hash:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.DEVICE_MISMATCH,
                    severity=38,
                    risk_level=RiskLevel.MEDIUM,
                    title="Missing device fingerprint evidence",
                    detail="No stable device fingerprint was attached to the session validation payload.",
                    evidence={},
                    penalty_score=4,
                ),
            )

        if not aggregate.payload_hash:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.PAYLOAD_TAMPERING,
                    severity=43,
                    risk_level=RiskLevel.MEDIUM,
                    title="Missing payload integrity hash",
                    detail="The session payload lacks a stable integrity hash, reducing confidence in tamper resistance.",
                    evidence={},
                    penalty_score=5,
                ),
            )

    def _check_captcha_integrity(
        self,
        aggregate: WatchSessionAggregate,
        metrics: dict[str, float | int | bool],
        signals: list[CompiledFraudSignal],
    ) -> None:
        if not aggregate.captcha_verified:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.CAPTCHA_FAILURE,
                    severity=93,
                    risk_level=RiskLevel.CRITICAL,
                    title="Captcha verification failed or missing",
                    detail="Reward validation requires a successful captcha verification for this flow.",
                    evidence={"captcha_verified": aggregate.captcha_verified},
                    penalty_score=38,
                ),
            )
            return

        if aggregate.captcha_score is not None and aggregate.captcha_score < 0.25:
            signals.append(
                CompiledFraudSignal(
                    event_type=FraudEventType.CAPTCHA_FAILURE,
                    severity=66,
                    risk_level=RiskLevel.HIGH,
                    title="Captcha trust score too low",
                    detail="Captcha verification passed structurally but returned a low trust score.",
                    evidence={"captcha_score": aggregate.captcha_score},
                    penalty_score=14,
                ),
            )

    def _resolve_integrity_grade(
        self,
        total_penalty: float,
        signals: list[CompiledFraudSignal],
        metrics: dict[str, float | int | bool],
    ) -> TelemetryIntegrityGrade:
        if any(signal.risk_level == RiskLevel.CRITICAL for signal in signals):
            return TelemetryIntegrityGrade.INVALID
        if total_penalty >= 45:
            return TelemetryIntegrityGrade.WEAK
        if total_penalty >= 18:
            return TelemetryIntegrityGrade.MODERATE
        return TelemetryIntegrityGrade.STRONG
