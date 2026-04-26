from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from apps.services_fastapi.src.modules.watch.repositories.fraud_event_repository import (
    FraudEventRepository,
)
from apps.services_fastapi.src.modules.watch.schemas.admin_fraud_review_contracts import (
    FraudEventListFilters,
    FraudEventListResponse,
    FraudSessionReviewSummary,
)
from apps.services_fastapi.src.modules.watch.services.fraud_event_query_service import (
    FraudEventQueryService,
)
from apps.services_fastapi.src.shared.dependencies.database import get_async_session

router = APIRouter(prefix="/watch/admin/fraud-events", tags=["watch-admin"])


def get_query_service(session=Depends(get_async_session)) -> FraudEventQueryService:
    repository = FraudEventRepository(session)
    return FraudEventQueryService(repository)


@router.get("", response_model=FraudEventListResponse, status_code=status.HTTP_200_OK)
async def list_fraud_events(
    user_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    ip_address: str | None = Query(default=None),
    fingerprint_hash: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    service: FraudEventQueryService = Depends(get_query_service),
) -> FraudEventListResponse:
    filters = FraudEventListFilters(
        user_id=user_id,
        session_id=session_id,
        ip_address=ip_address,
        fingerprint_hash=fingerprint_hash,
        risk_level=risk_level,
        severity=severity,
        limit=limit,
    )
    return await service.list_events(filters)


@router.get(
    "/session/{session_id}/summary",
    response_model=FraudSessionReviewSummary,
    status_code=status.HTTP_200_OK,
)
async def summarize_session(
    session_id: str,
    service: FraudEventQueryService = Depends(get_query_service),
) -> FraudSessionReviewSummary:
    return await service.summarize_session(session_id)
