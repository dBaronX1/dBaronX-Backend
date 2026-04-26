from __future__ import annotations

from collections.abc import Iterable

from apps.services_fastapi.src.modules.watch.repositories.fraud_event_repository import (
    FraudEventRepository,
)
from apps.services_fastapi.src.modules.watch.schemas.admin_fraud_review_contracts import (
    FraudEventListFilters,
    FraudEventListResponse,
    FraudEventView,
    FraudSessionReviewSummary,
)


_RISK_RANK = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


class FraudEventQueryService:
    """
    Canonical read/query layer for fraud event operations.

    This service turns persistence models into stable operator-facing contracts.
    """

    def __init__(self, repository: FraudEventRepository) -> None:
        self._repository = repository

    async def list_events(
        self,
        filters: FraudEventListFilters,
    ) -> FraudEventListResponse:
        items = await self._repository.search(
            user_id=filters.user_id,
            session_id=filters.session_id,
            ip_address=filters.ip_address,
            fingerprint_hash=filters.fingerprint_hash,
            risk_level=filters.risk_level,
            severity=filters.severity,
            limit=filters.limit,
        )

        views = [self._to_view(item) for item in items]
        return FraudEventListResponse(total=len(views), items=views)

    async def summarize_session(
        self,
        session_id: str,
    ) -> FraudSessionReviewSummary:
        items = await self._repository.list_for_session(session_id)

        if not items:
            return FraudSessionReviewSummary(session_id=session_id)

        highest = max(
            (str(item.risk_level or "low") for item in items),
            key=lambda level: _RISK_RANK.get(level, 0),
        )

        return FraudSessionReviewSummary(
            session_id=session_id,
            user_id=items[0].user_id,
            total_events=len(items),
            critical_events=sum(1 for item in items if item.severity == "critical"),
            high_events=sum(1 for item in items if item.severity in {"high", "critical"}),
            total_score_delta=round(
                sum(float(item.score_delta or 0.0) for item in items),
                4,
            ),
            highest_risk_level=highest,  # type: ignore[arg-type]
            first_event_at=min(item.created_at for item in items),
            last_event_at=max(item.created_at for item in items),
        )

    def _to_view(self, item) -> FraudEventView:
        return FraudEventView(
            id=item.id,
            session_id=item.session_id,
            user_id=item.user_id,
            watch_id=item.watch_id,
            signal_code=item.signal_code,
            signal_label=item.signal_label,
            severity=item.severity,
            risk_level=item.risk_level,
            score_delta=float(item.score_delta or 0.0),
            evidence=item.evidence or {},
            ip_address=item.ip_address,
            fingerprint_hash=item.fingerprint_hash,
            created_at=item.created_at,
        )
