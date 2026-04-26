from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import bindparam, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.services_fastapi.src.modules.watch.models.fraud_event import FraudEvent


class FraudEventRepository:
    """
    Canonical fraud-event repository for watch validation persistence.

    This repository is intentionally narrow:
    - dedupe lookups by session + fingerprint
    - bulk inserts for explainable event rows
    - query helpers for admin/ops and downstream analytics
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_existing_event_ids(
        self,
        session_id: str,
        event_fingerprints: Sequence[str],
    ) -> set[str]:
        if not event_fingerprints:
            return set()

        stmt = (
            select(FraudEvent.fingerprint)
            .where(FraudEvent.session_id == session_id)
            .where(FraudEvent.fingerprint.in_(bindparam("fingerprints", expanding=True)))
        )

        result = await self.session.execute(
            stmt,
            {"fingerprints": list(event_fingerprints)},
        )
        return {row[0] for row in result.fetchall()}

    async def insert_many(self, rows: list[dict[str, Any]]) -> list[str]:
        if not rows:
            return []

        instances = [FraudEvent(**row) for row in rows]
        self.session.add_all(instances)
        await self.session.flush()

        return [str(instance.id) for instance in instances if instance.id is not None]

    async def list_for_session(
        self,
        session_id: str,
    ) -> list[FraudEvent]:
        stmt = (
            select(FraudEvent)
            .where(FraudEvent.session_id == session_id)
            .order_by(FraudEvent.created_at.asc(), FraudEvent.severity.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_user(
        self,
        user_id: str,
        *,
        limit: int = 100,
    ) -> list[FraudEvent]:
        stmt = (
            select(FraudEvent)
            .where(FraudEvent.user_id == user_id)
            .order_by(FraudEvent.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_recent_high_risk_events(
        self,
        *,
        user_id: str | None = None,
        fingerprint_hash: str | None = None,
        ip_address: str | None = None,
        since,
    ) -> int:
        stmt = select(FraudEvent.id).where(FraudEvent.created_at >= since)

        if user_id:
          stmt = stmt.where(FraudEvent.user_id == user_id)
        if fingerprint_hash:
          stmt = stmt.where(FraudEvent.fingerprint_hash == fingerprint_hash)
        if ip_address:
          stmt = stmt.where(FraudEvent.ip_address == ip_address)

        stmt = stmt.where(FraudEvent.risk_level.in_(["high", "critical"]))

        result = await self.session.execute(stmt)
        return len(result.fetchall())
