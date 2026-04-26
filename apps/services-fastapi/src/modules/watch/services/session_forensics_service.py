from __future__ import annotations

from apps.services_fastapi.src.modules.watch.repositories.fraud_event_repository import (
    FraudEventRepository,
)
from apps.services_fastapi.src.modules.watch.schemas.session_forensics_contracts import (
    SessionForensicsResponse,
    SessionForensicsSignal,
)


_RISK_RANK = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


class SessionForensicsService:
    """
    Session-level forensic view for operators, anti-abuse triage,
    and support investigation.
    """

    def __init__(self, repository: FraudEventRepository) -> None:
        self._repository = repository

    async def get(self, session_id: str) -> SessionForensicsResponse:
        items = await self._repository.list_for_session(session_id)

        if not items:
            return SessionForensicsResponse(session_id=session_id, signals=[])

        highest = max(
            (str(item.risk_level or "low") for item in items),
            key=lambda level: _RISK_RANK.get(level, 0),
        )

        signals = [
            SessionForensicsSignal(
                event_id=item.id,
                created_at=item.created_at,
                signal_code=item.signal_code,
                signal_label=item.signal_label,
                severity=item.severity,
                risk_level=item.risk_level,
                score_delta=float(item.score_delta or 0.0),
                evidence=item.evidence or {},
            )
            for item in items
        ]

        return SessionForensicsResponse(
            session_id=session_id,
            user_id=items[0].user_id,
            ip_address=items[0].ip_address,
            fingerprint_hash=items[0].fingerprint_hash,
            total_signals=len(signals),
            total_penalty_score=round(
                sum(float(item.score_delta or 0.0) for item in items),
                4,
            ),
            highest_risk_level=highest,
            signals=signals,
        )
