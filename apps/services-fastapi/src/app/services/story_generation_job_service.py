from __future__ import annotations

import hashlib
import time
from typing import Any

from app.services.story_generation_service import StoryGenerationService


class StoryGenerationJobService:
    """
    Stateless job orchestration layer for generation requests.

    Canonical purpose:
    - give NestJS and future workers stable job envelopes
    - support idempotency-friendly request fingerprints
    - keep generation API ready for async queues without rewriting contracts
    """

    def __init__(
        self,
        *,
        generation_service: StoryGenerationService | None = None,
    ) -> None:
        self.generation_service = generation_service or StoryGenerationService()

    async def run_job(
        self,
        *,
        prompt: str,
        genre: str | None = None,
        tone: str | None = None,
        language: str | None = None,
        target_words: int = 900,
        title_hint: str | None = None,
        audience: str | None = None,
        request_id: str | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        started_at = time.perf_counter()
        fingerprint = self._fingerprint(
            prompt=prompt,
            genre=genre,
            tone=tone,
            language=language,
            target_words=target_words,
            title_hint=title_hint,
            audience=audience,
            user_id=user_id,
        )
        job_id = request_id or f"story_job_{fingerprint[:24]}"

        generation = await self.generation_service.generate(
            prompt=prompt,
            genre=genre,
            tone=tone,
            language=language,
            target_words=target_words,
            title_hint=title_hint,
            audience=audience,
        )

        return {
            "success": generation["success"],
            "job_id": job_id,
            "fingerprint": fingerprint,
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
            "result": generation,
            "meta": {
                "user_id": user_id,
                "request_id": request_id,
                "async_ready": True,
            },
        }

    def _fingerprint(
        self,
        *,
        prompt: str,
        genre: str | None,
        tone: str | None,
        language: str | None,
        target_words: int,
        title_hint: str | None,
        audience: str | None,
        user_id: str | None,
    ) -> str:
        raw = "|".join(
            [
                (user_id or "").strip(),
                prompt.strip(),
                (genre or "").strip(),
                (tone or "").strip(),
                (language or "").strip(),
                str(target_words),
                (title_hint or "").strip(),
                (audience or "").strip(),
            ]
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
