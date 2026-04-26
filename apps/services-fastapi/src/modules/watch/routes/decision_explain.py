from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from apps.services_fastapi.src.modules.watch.repositories.fraud_event_repository import (
    FraudEventRepository,
)
from apps.services_fastapi.src.modules.watch.schemas.decision_explain_contracts import (
    ExplainDecisionRequest,
    ExplainDecisionResponse,
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
from apps.services_fastapi.src.modules.watch.services.watch_decision_explainer import (
    WatchDecisionExplainer,
)
from apps.services_fastapi.src.modules.watch.services.watch_validation_orchestrator import (
    WatchValidationOrchestrator,
)
from apps.services_fastapi.src.shared.dependencies.database import get_async_session


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


router = APIRouter(prefix="/watch", tags=["watch-validation"])


def get_explain_dependencies(session=Depends(get_async_session)) -> tuple[
    WatchValidationOrchestrator,
    WatchDecisionExplainer,
]:
    repository = FraudEventRepository(session)
    orchestrator = WatchValidationOrchestrator(
        anomaly_compiler=SessionAnomalyCompiler(),
        decision_builder=ValidationDecisionBuilder(),
        fraud_persistence=FraudEventPersistenceService(repository),
        abuse_reader=_RepoBackedAbuseReader(repository),
    )
    explainer = WatchDecisionExplainer()
    return orchestrator, explainer


@router.post(
    "/explain-decision",
    response_model=ExplainDecisionResponse,
    status_code=status.HTTP_200_OK,
)
async def explain_decision(
    payload: ExplainDecisionRequest,
    deps: tuple[WatchValidationOrchestrator, WatchDecisionExplainer] = Depends(
        get_explain_dependencies
    ),
) -> ExplainDecisionResponse:
    orchestrator, explainer = deps

    try:
        result = await orchestrator.validate(payload.aggregate)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="failed to explain watch decision",
        ) from exc

    explanation = explainer.explain(
        payload.aggregate,
        result.anomaly_report,
        result.decision,
    )

    return ExplainDecisionResponse(
        decision=result.decision,
        explanation=explanation,
    )
