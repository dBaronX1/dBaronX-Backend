from __future__ import annotations

from datetime import UTC, datetime, timedelta

from apps.services_fastapi.src.modules.watch.repositories.fraud_event_repository import (
    FraudEventRepository,
)


class WatchRiskSummaryService:
    """
    Lightweight operator-facing summary service.

    Delivers small, mobile-friendly payloads for dashboards and admin cards
    without forcing large forensic payload transfers.
    """

    def __init__(self, repository: FraudEventRepository) -> None:
        self._repository = repository

    async def summarize_recent_activity(
        self,
        *,
        user_id: str | None = None,
        fingerprint_hash: str | None = None,
        ip_address: str | None = None,
    ) -> dict[str, object]:
        now = datetime.now(UTC)

        count_1h = await self._repository.count_recent_high_risk_events(
            user_id=user_id,
            fingerprint_hash=fingerprint_hash,
            ip_address=ip_address,
            since=now - timedelta(hours=1),
        )
        count_24h = await self._repository.count_recent_high_risk_events(
            user_id=user_id,
            fingerprint_hash=fingerprint_hash,
            ip_address=ip_address,
            since=now - timedelta(hours=24),
        )
        count_7d = await self._repository.count_recent_high_risk_events(
            user_id=user_id,
            fingerprint_hash=fingerprint_hash,
            ip_address=ip_address,
            since=now - timedelta(days=7),
        )

        risk_bucket = "low"
        if count_24h >= 10 or count_7d >= 25:
            risk_bucket = "critical"
        elif count_24h >= 6 or count_7d >= 15:
            risk_bucket = "high"
        elif count_24h >= 3 or count_7d >= 8:
            risk_bucket = "medium"

        return {
            "success": True,
            "filters": {
                "user_id": user_id,
                "fingerprint_hash": fingerprint_hash,
                "ip_address": ip_address,
            },
            "summary": {
                "high_risk_events_1h": count_1h,
                "high_risk_events_24h": count_24h,
                "high_risk_events_7d": count_7d,
                "risk_bucket": risk_bucket,
            },
            "generated_at": now.isoformat(),
        }
