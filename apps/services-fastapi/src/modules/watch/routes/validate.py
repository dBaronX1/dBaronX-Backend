from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from apps.services_fastapi.src.modules.watch.schemas.session_validation_contracts import (
    ValidationDecision,
    WatchSessionAggregate,
)
from apps.services_fastapi.src.modules.watch.services.watch_validation_orchestrator import (
    WatchValidationOrchestrator,
    WatchValidationOutput,
)
from apps.services_fastapi.src.shared.dependencies.database import get_async_session
from apps.services_fastapi.src.modules.watch.repositories.fraud_event_repository import (
    FraudEventRepository,
)
from apps.services_fastapi.src.modules.watch.services.fraud_event_persistence import (
    FraudEventPersistenceService,
)
from apps.services_fastapi.src.modules.watch.services.session_anomaly_compiler import (
    SessionAnomalyCompiler,
)
from apps.services_fastapi.src.modules.watch.services.validation_decision_builder import (
    ValidationDecisionBuilder,
)


router = APIRouter(prefix="/watch", tags=["watch-validation"])


class ValidateWatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    aggregate: WatchSessionAggregate


class ValidateWatchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool = True
    decision: ValidationDecision
    anomaly_signal_count: int = Field(ge=0)
    persisted_fraud_event_count: int = Field(ge=0)
    deduplicated_fraud_event_count: int = Field(ge=0)
    escalation_applied: bool = False


class _RepoBackedAbuseReader:
    def __init__(self, repository: FraudEventRepository) -> None:
        self._repository = repository

    async def count_recent_high_risk_events(
        self,
        *,
        user_id: str | None = None,
        fingerprint_hash: str | None = None,
        ip_address: str | None = None,
        since,
    ) -> int:
        return await self._repository.count_recent_high_risk_events(
            user_id=user_id,
            fingerprint_hash=fingerprint_hash,
            ip_address=ip_address,
            since=since,
        )


async def get_watch_validation_orchestrator(
    session=Depends(get_async_session),
) -> WatchValidationOrchestrator:
    repository = FraudEventRepository(session)
    return WatchValidationOrchestrator(
        anomaly_compiler=SessionAnomalyCompiler(),
        decision_builder=ValidationDecisionBuilder(),
        fraud_persistence=FraudEventPersistenceService(repository),
        abuse_reader=_RepoBackedAbuseReader(repository),
    )


@router.post(
    "/validate-session",
    response_model=ValidateWatchResponse,
    status_code=status.HTTP_200_OK,
)
async def validate_session(
    payload: ValidateWatchRequest,
    orchestrator: WatchValidationOrchestrator = Depends(get_watch_validation_orchestrator),
) -> ValidateWatchResponse:
    try:
        result: WatchValidationOutput = await orchestrator.validate(payload.aggregate)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="watch validation failed",
        ) from exc

    return ValidateWatchResponse(
        decision=result.decision,
        anomaly_signal_count=len(result.anomaly_report.signals),
        persisted_fraud_event_count=result.persistence.inserted_count,
        deduplicated_fraud_event_count=result.persistence.deduplicated_count,
        escalation_applied=result.escalation_applied,
    )
