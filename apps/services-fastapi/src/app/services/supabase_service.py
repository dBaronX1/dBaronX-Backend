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

    async def insert_one(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = (
            self.client()
            .schema("app_public")
            .table(table)
            .insert(payload)
            .execute()
        )
        rows = response.data or []
        return dict(rows[0]) if rows else {}

    async def update_one(self, table: str, *, match: dict[str, Any], values: dict[str, Any]) -> dict[str, Any]:
        query = self.client().schema("app_public").table(table).update(values)
        for key, value in match.items():
            query = query.eq(key, value)
        response = query.execute()
        rows = response.data or []
        return dict(rows[0]) if rows else {}

    async def insert_ai_story(self, payload: dict[str, Any]) -> dict[str, Any]:
        safe_payload = dict(payload)
        metadata = dict(safe_payload.get("metadata") or {})
        for secret_key in (
            "OPENAI_API_KEY",
            "GEMINI_API_KEY",
            "GOOGLE_GENERATIVE_AI_API_KEY",
            "ANTHROPIC_API_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "INTERNAL_SERVICE_TOKEN",
        ):
            metadata.pop(secret_key, None)
        safe_payload["metadata"] = metadata
        return await self.insert_one("ai_stories", safe_payload)

    async def ai_stories_ready(self) -> bool:
        try:
            self.client().schema("app_public").table("ai_stories").select("id").limit(1).execute()
            return True
        except Exception:
            return False
