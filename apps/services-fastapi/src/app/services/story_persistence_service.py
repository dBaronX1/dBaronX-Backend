from __future__ import annotations

import os
from typing import Any

import httpx


class StoryPersistenceService:
    """
    Canonical persistence bridge for AI-story intelligence outputs.

    Responsibilities:
    - create/update generation jobs
    - persist generated story records
    - persist moderation logs
    - remain safe even when Supabase REST is unavailable
    - provide predictable records back to callers for NestJS synchronization
    """

    def __init__(
        self,
        *,
        supabase_url: str | None = None,
        supabase_service_role_key: str | None = None,
        timeout_seconds: float = 15.0,
    ) -> None:
        self.supabase_url = (supabase_url or os.getenv("SUPABASE_URL") or "").rstrip("/")
        self.supabase_service_role_key = (
            supabase_service_role_key
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or ""
        )
        self.timeout_seconds = timeout_seconds

    @property
    def enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    async def create_generation_job(
        self,
        *,
        user_id: str | None,
        prompt: str,
        genre: str,
        tone: str,
        language: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "prompt": prompt,
            "genre": genre,
            "tone": tone,
            "language": language,
            "status": "queued",
            "metadata": metadata or {},
        }
        return await self._insert_one("ai_story_generation_jobs", payload)

    async def mark_job_running(
        self,
        *,
        job_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "status": "running",
            "started_at": self._now_iso(),
            "metadata": metadata or {},
        }
        return await self._update_one(
            "ai_story_generation_jobs",
            filters={"id": f"eq.{job_id}"},
            payload=payload,
        )

    async def mark_job_completed(
        self,
        *,
        job_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "status": "completed",
            "completed_at": self._now_iso(),
            "metadata": metadata or {},
        }
        return await self._update_one(
            "ai_story_generation_jobs",
            filters={"id": f"eq.{job_id}"},
            payload=payload,
        )

    async def mark_job_failed(
        self,
        *,
        job_id: str,
        error_message: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "status": "failed",
            "completed_at": self._now_iso(),
            "error_message": error_message,
            "metadata": metadata or {},
        }
        return await self._update_one(
            "ai_story_generation_jobs",
            filters={"id": f"eq.{job_id}"},
            payload=payload,
        )

    async def save_story_record(
        self,
        *,
        user_id: str | None,
        title: str,
        slug: str,
        prompt: str,
        content: str,
        excerpt: str,
        genre: str,
        tone: str,
        language: str,
        provider: str,
        tags: list[str],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "title": title,
            "slug": slug,
            "prompt": prompt,
            "content": content,
            "excerpt": excerpt,
            "genre": genre,
            "tone": tone,
            "language": language,
            "provider": provider,
            "tags": tags,
            "status": "ready",
            "metadata": metadata or {},
        }
        return await self._insert_one("ai_stories", payload)

    async def save_moderation_result(
        self,
        *,
        story_id: str | None,
        user_id: str | None,
        allowed: bool,
        flags: list[str],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "story_id": story_id,
            "user_id": user_id,
            "allowed": allowed,
            "flags": flags,
            "metadata": metadata or {},
        }
        return await self._insert_one("ai_story_moderation_logs", payload)

    async def _insert_one(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.enabled:
            return self._fallback_record(table=table, payload=payload, mode="insert")

        url = f"{self.supabase_url}/rest/v1/{table}"
        headers = self._headers(prefer_return_representation=True)

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code >= 400:
                return self._fallback_record(
                    table=table,
                    payload=payload,
                    mode="insert",
                    error=self._error_message(response),
                )

            data = response.json()
            if isinstance(data, list) and data:
                return data[0]
            return payload

    async def _update_one(
        self,
        table: str,
        *,
        filters: dict[str, str],
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        if not self.enabled:
            return self._fallback_record(table=table, payload=payload, mode="update")

        url = f"{self.supabase_url}/rest/v1/{table}"
        headers = self._headers(prefer_return_representation=True)

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.patch(url, headers=headers, params=filters, json=payload)
            if response.status_code >= 400:
                return self._fallback_record(
                    table=table,
                    payload=payload,
                    mode="update",
                    error=self._error_message(response),
                )

            data = response.json()
            if isinstance(data, list) and data:
                return data[0]
            return payload

    def _headers(self, *, prefer_return_representation: bool) -> dict[str, str]:
        headers = {
            "apikey": self.supabase_service_role_key,
            "Authorization": f"Bearer {self.supabase_service_role_key}",
            "Content-Type": "application/json",
        }
        if prefer_return_representation:
            headers["Prefer"] = "return=representation"
        return headers

    def _fallback_record(
        self,
        *,
        table: str,
        payload: dict[str, Any],
        mode: str,
        error: str | None = None,
    ) -> dict[str, Any]:
        return {
            "id": None,
            "table": table,
            "mode": mode,
            "persisted": False,
            "fallback": True,
            "error": error,
            **payload,
        }

    def _error_message(self, response: httpx.Response) -> str:
        try:
            body = response.json()
            if isinstance(body, dict):
                return str(
                    body.get("message")
                    or body.get("error_description")
                    or body.get("hint")
                    or body
                )
        except Exception:
            pass
        return response.text or f"HTTP {response.status_code}"

    def _now_iso(self) -> str:
        from datetime import UTC, datetime

        return datetime.now(UTC).isoformat()
