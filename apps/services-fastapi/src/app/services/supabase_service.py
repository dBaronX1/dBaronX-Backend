from __future__ import annotations

from time import perf_counter
from typing import Any

from supabase import Client, create_client

from app.core.config import Settings, get_settings
from app.core.constants import DEFAULT_HEALTH_TABLE
from app.core.logging import get_logger
from app.schemas.common import ServiceDependencyHealth

logger = get_logger("app.supabase")


class SupabaseService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: Client | None = None

    def client(self) -> Client:
        if self._client is None:
            self._client = create_client(
                self.settings.supabase_url,
                self.settings.supabase_service_role_key,
            )
        return self._client

    async def health(self) -> ServiceDependencyHealth:
        started = perf_counter()
        try:
            response = self.client().table(DEFAULT_HEALTH_TABLE).select("*").limit(1).execute()
            latency_ms = round((perf_counter() - started) * 1000, 2)
            return ServiceDependencyHealth(
                ok=True,
                source="supabase",
                latency_ms=latency_ms,
                details={"rows": len(response.data or [])},
            )
        except Exception as exc:
            latency_ms = round((perf_counter() - started) * 1000, 2)
            return ServiceDependencyHealth(
                ok=False,
                source="supabase",
                latency_ms=latency_ms,
                error=str(exc),
            )

    async def insert_risk_event(self, payload: dict[str, Any]) -> None:
        try:
            self.client().table("risk_events").insert(payload).execute()
        except Exception as exc:
            logger.warning(
                "Failed to persist risk event",
                extra={"error": str(exc), "payload_keys": list(payload.keys())},
            )

    async def get_user_risk_profile(self, user_id: str) -> dict[str, Any] | None:
        try:
            result = (
                self.client()
                .table("user_risk_profiles")
                .select("*")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            rows = result.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    async def get_device_record(self, fingerprint: str) -> dict[str, Any] | None:
        try:
            result = (
                self.client()
                .table("user_devices")
                .select("*")
                .eq("fingerprint", fingerprint)
                .limit(1)
                .execute()
            )
            rows = result.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    async def upsert_device_record(self, payload: dict[str, Any]) -> None:
        try:
            self.client().table("user_devices").upsert(payload).execute()
        except Exception as exc:
            logger.warning(
                "Failed to upsert device record",
                extra={"error": str(exc)},
            )
