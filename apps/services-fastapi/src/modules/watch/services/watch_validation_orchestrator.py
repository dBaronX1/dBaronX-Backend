from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from apps.services_fastapi.src.modules.watch.schemas.session_validation_contracts import (
    FraudPersistenceResult,
    SessionAnomalyReport,
    ValidationDecision,
    WatchSessionAggregate,
)
from apps.services_fastapi.src.modules.watch.services.session_anomaly_compiler import (
    SessionAnomalyCompiler,
)
from apps.services_fastapi.src.modules.watch.services.validation_decision_builder import (
    ValidationDecisionBuilder,
)
from apps.services_fastapi.src.modules.watch.services.fraud_event_persistence import (
    FraudEventPersistenceService,
)


class AbuseSignalReader(Protocol):
    async def count_recent_high_risk_events(
        self,
        *,
        user_id: str | None = None,
        fingerprint_hash: str | None = None,
        ip_address: str | None = None,
        since: datetime,
    ) -> int: ...


@dataclass(slots=True)
class WatchValidationOutput:
    decision: ValidationDecision
    anomaly_report: SessionAnomalyReport
    persistence: FraudPersistenceResult
    escalation_applied: bool


class WatchValidationOrchestrator:
    """
    Canonical watch-validation pipeline.

    Flow:
    1. Compile anomaly report from session aggregate
    2. Escalate based on recent high-risk history
    3. Build contract decision
    4. Persist explainable fraud events
    5. Return one deterministic orchestration result
    """

    def __init__(
        self,
        anomaly_compiler: SessionAnomalyCompiler,
        decision_builder: ValidationDecisionBuilder,
        fraud_persistence: FraudEventPersistenceService,
        abuse_reader: AbuseSignalReader,
    ) -> None:
        self._anomaly_compiler = anomaly_compiler
        self._decision_builder = decision_builder
        self._fraud_persistence = fraud_persistence
        self._abuse_reader = abuse_reader

    async def validate(
        self,
        aggregate: WatchSessionAggregate,
    ) -> WatchValidationOutput:
        anomaly_report = self._anomaly_compiler.compile(aggregate)
        anomaly_report, escalation_applied = await self._apply_history_escalation(
            aggregate,
            anomaly_report,
        )

        decision = self._decision_builder.build(aggregate, anomaly_report)
        persistence = await self._fraud_persistence.persist_anomaly_report(
            aggregate,
            anomaly_report,
        )

        return WatchValidationOutput(
            decision=decision,
            anomaly_report=anomaly_report,
            persistence=persistence,
            escalation_applied=escalation_applied,
        )

    async def _apply_history_escalation(
        self,
        aggregate: WatchSessionAggregate,
        anomaly_report: SessionAnomalyReport,
    ) -> tuple[SessionAnomalyReport, bool]:
        since = datetime.now(UTC) - timedelta(hours=24)

        historical_count = await self._abuse_reader.count_recent_high_risk_events(
            user_id=aggregate.user_id,
            fingerprint_hash=aggregate.fingerprint_hash,
            ip_address=aggregate.ip_address,
            since=since,
        )

        if historical_count < 3:
            return anomaly_report, False

        derived = dict(anomaly_report.derived_metrics)
        derived["recent_high_risk_event_count_24h"] = historical_count
        derived["history_escalation_applied"] = True

        penalty_multiplier = 1.15 if historical_count < 6 else 1.35
        new_total = round(anomaly_report.total_penalty_score * penalty_multiplier, 4)

        upgraded = anomaly_report.model_copy(
            update={
                "total_penalty_score": new_total,
                "derived_metrics": derived,
            },
        )
        return upgraded, True
