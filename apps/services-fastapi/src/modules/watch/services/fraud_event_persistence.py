from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any, Protocol

from apps.services_fastapi.src.modules.watch.schemas.session_validation_contracts import (
    FraudEventWrite,
    FraudPersistenceResult,
    SessionAnomalyReport,
    WatchSessionAggregate,
)


class AsyncFraudRepository(Protocol):
    async def find_existing_event_ids(
        self,
        session_id: str,
        event_fingerprints: Sequence[str],
    ) -> set[str]: ...

    async def insert_many(
        self,
        rows: list[dict[str, Any]],
    ) -> list[str]: ...


class FraudEventPersistenceService:
    """
    Canonical persistence bridge for FastAPI watch-validation fraud events.

    This service writes explainable signals into durable storage without
    making the anomaly compiler depend on a specific ORM or database engine.
    """

    def __init__(self, repository: AsyncFraudRepository) -> None:
        self._repository = repository

    async def persist_anomaly_report(
        self,
        aggregate: WatchSessionAggregate,
        report: SessionAnomalyReport,
    ) -> FraudPersistenceResult:
        records = self._build_records(aggregate, report)
        if not records:
            return FraudPersistenceResult(
                inserted_count=0,
                deduplicated_count=0,
                failed_count=0,
                record_ids=[],
            )

        fingerprints = [row["fingerprint"] for row in records]
        existing = await self._repository.find_existing_event_ids(
            aggregate.session_id,
            fingerprints,
        )

        to_insert: list[dict[str, Any]] = []
        deduplicated_count = 0

        for row in records:
            if row["fingerprint"] in existing:
                deduplicated_count += 1
                continue
            to_insert.append(row)

        if not to_insert:
            return FraudPersistenceResult(
                inserted_count=0,
                deduplicated_count=deduplicated_count,
                failed_count=0,
                record_ids=[],
            )

        inserted_ids = await self._repository.insert_many(to_insert)

        return FraudPersistenceResult(
            inserted_count=len(inserted_ids),
            deduplicated_count=deduplicated_count,
            failed_count=max(0, len(to_insert) - len(inserted_ids)),
            record_ids=inserted_ids,
        )

    def _build_records(
        self,
        aggregate: WatchSessionAggregate,
        report: SessionAnomalyReport,
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        created_at = datetime.now(UTC)

        for signal in report.signals:
            event = FraudEventWrite(
                session_id=aggregate.session_id,
                user_id=aggregate.user_id,
                ad_id=aggregate.ad_id,
                event_type=signal.event_type,
                risk_level=signal.risk_level,
                severity=signal.severity,
                title=signal.title,
                detail=signal.detail,
                evidence=signal.evidence,
                penalty_score=signal.penalty_score,
                fingerprint_hash=aggregate.fingerprint_hash,
                ip_address=aggregate.ip_address,
                payload_hash=aggregate.payload_hash,
                created_at=created_at,
            )

            fingerprint = self._fingerprint(event)

            rows.append(
                {
                    "fingerprint": fingerprint,
                    "session_id": event.session_id,
                    "user_id": event.user_id,
                    "ad_id": event.ad_id,
                    "event_type": event.event_type.value,
                    "risk_level": event.risk_level.value,
                    "severity": event.severity,
                    "title": event.title,
                    "detail": event.detail,
                    "evidence": event.evidence,
                    "penalty_score": event.penalty_score,
                    "fingerprint_hash": event.fingerprint_hash,
                    "ip_address": event.ip_address,
                    "payload_hash": event.payload_hash,
                    "created_at": event.created_at.isoformat(),
                },
            )

        return rows

    def _fingerprint(self, event: FraudEventWrite) -> str:
        canonical = {
            "session_id": event.session_id,
            "event_type": event.event_type.value,
            "severity": event.severity,
            "title": event.title,
            "detail": event.detail,
            "evidence": self._canonicalize(event.evidence),
            "payload_hash": event.payload_hash,
        }
        serialized = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
        return f"{event.session_id}:{hash(serialized)}"

    def _canonicalize(self, payload: dict[str, Any]) -> dict[str, Any]:
        return json.loads(json.dumps(payload, sort_keys=True, default=str))
