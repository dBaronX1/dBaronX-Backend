from __future__ import annotations

from typing import Any

from app.services.supabase_service import SupabaseService


class StoryRepository:
    """
    Canonical persistence boundary for AI story intelligence layer.

    Notes:
    - FastAPI owns generation intelligence
    - NestJS may own broader lifecycle/orchestration
    - repository keeps storage semantics stable and reusable
    """

    def __init__(self, *, supabase: SupabaseService) -> None:
        self.supabase = supabase

    async def create_generation_job(
        self,
        *,
        user_id: str | None,
        prompt: str,
        genre: str,
        tone: str,
        language: str,
        status: str = "queued",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "prompt": prompt,
            "genre": genre,
            "tone": tone,
            "language": language,
            "status": status,
            "metadata": metadata or {},
        }
        return await self.supabase.insert_one("ai_story_generation_jobs", payload)

    async def mark_generation_job(
        self,
        *,
        job_id: str,
        status: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self.supabase.update_one(
            "ai_story_generation_jobs",
            match={"id": job_id},
            values={
                "status": status,
                "metadata": metadata or {},
            },
        )

    async def save_story(
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
        return await self.supabase.insert_one("ai_stories", payload)

    async def save_moderation_log(
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
        return await self.supabase.insert_one("ai_story_moderation_logs", payload)
