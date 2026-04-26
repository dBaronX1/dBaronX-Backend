from __future__ import annotations

from datetime import UTC, datetime, timedelta

from apps.services_fastapi.src.modules.watch.schemas.session_validation_contracts import (
    DecisionCode,
    RiskLevel,
    SessionAnomalyReport,
    TelemetryIntegrityGrade,
    ValidationDecision,
    WatchSessionAggregate,
)


class ValidationDecisionBuilder:
    """
    Canonical reward-validation contract builder.

    The output of this class is what NestJS should trust when deciding whether
    a watch session can proceed to settlement orchestration.
    """

    def build(
        self,
        aggregate: WatchSessionAggregate,
        anomaly_report: SessionAnomalyReport,
    ) -> ValidationDecision:
        risk_score = self._compute_risk_score(anomaly_report.total_penalty_score)
        risk_level = self._resolve_risk_level(risk_score)
        decision = self._resolve_decision(anomaly_report, risk_score)

        rejection_reasons: list[str] = []
        warnings: list[str] = []

        for signal in anomaly_report.signals:
            if signal.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
                rejection_reasons.append(signal.title)
            elif signal.risk_level == RiskLevel.MEDIUM:
                warnings.append(signal.title)

        manual_review_required = decision == DecisionCode.REVIEW
        reward_allowed = decision == DecisionCode.ALLOW
        payout_allowed = reward_allowed

        next_eligible_at = None
        if decision != DecisionCode.ALLOW:
            next_eligible_at = self._derive_next_eligible_at(aggregate, anomaly_report)

        return ValidationDecision(
            session_id=aggregate.session_id,
            user_id=aggregate.user_id,
            ad_id=aggregate.ad_id,
            decision=decision,
            risk_level=risk_level,
            risk_score=risk_score,
            payout_allowed=payout_allowed,
            reward_allowed=reward_allowed,
            manual_review_required=manual_review_required,
            next_eligible_at=next_eligible_at,
            rejection_reasons=self._dedupe(rejection_reasons),
            warnings=self._dedupe(warnings),
            anomaly_report=anomaly_report,
            settlement_reference=self._build_settlement_reference(aggregate, decision),
        )

    def _compute_risk_score(self, total_penalty_score: float) -> float:
        """
        Compress anomaly penalties into a stable 0..100 contract score.
        The curve intentionally rises faster in the mid-zone so borderline
        sessions are more likely to go to review instead of silent allow.
        """
        if total_penalty_score <= 0:
            return 0.0

        score = total_penalty_score * 1.8
        if total_penalty_score >= 15:
            score += 8
        if total_penalty_score >= 30:
            score += 10
        if total_penalty_score >= 45:
            score += 12

        return round(min(100.0, score), 4)

    def _resolve_risk_level(self, risk_score: float) -> RiskLevel:
        if risk_score >= 85:
            return RiskLevel.CRITICAL
        if risk_score >= 60:
            return RiskLevel.HIGH
        if risk_score >= 25:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _resolve_decision(
        self,
        anomaly_report: SessionAnomalyReport,
        risk_score: float,
    ) -> DecisionCode:
        if anomaly_report.integrity_grade == TelemetryIntegrityGrade.INVALID:
            return DecisionCode.REJECT

        if anomaly_report.has_blocking_signal:
            return DecisionCode.REJECT

        if risk_score >= 70:
            return DecisionCode.REJECT

        if risk_score >= 30 or anomaly_report.integrity_grade == TelemetryIntegrityGrade.MODERATE:
            return DecisionCode.REVIEW

        return DecisionCode.ALLOW

    def _derive_next_eligible_at(
        self,
        aggregate: WatchSessionAggregate,
        anomaly_report: SessionAnomalyReport,
    ) -> datetime:
        now = datetime.now(UTC)
        if any(signal.event_type.value == "duplicate_reward_attempt" for signal in anomaly_report.signals):
            return now + timedelta(hours=24)

        if any(signal.event_type.value == "session_duplicate" for signal in anomaly_report.signals):
            return now + timedelta(hours=24)

        if anomaly_report.has_blocking_signal:
            return now + timedelta(hours=6)

        return now + timedelta(minutes=30)

    def _build_settlement_reference(
        self,
        aggregate: WatchSessionAggregate,
        decision: DecisionCode,
    ) -> str | None:
        if decision != DecisionCode.ALLOW:
            return None
        ts = int(datetime.now(UTC).timestamp())
        return f"w2e_{aggregate.user_id}_{aggregate.ad_id}_{ts}"

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        ordered: list[str] = []

        for item in items:
            normalized = item.strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            ordered.append(normalized)

        return ordered
