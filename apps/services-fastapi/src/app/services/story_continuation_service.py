from __future__ import annotations

from typing import Any

from app.core.exceptions import DomainError
from app.services.content_moderation_service import ContentModerationService
from app.services.llm_orchestrator_service import LLMOrchestratorService


class StoryContinuationService:
    """
    Continues an existing story with controlled narrative continuity.

    Used by:
    - AI Stories editor continuation
    - premium creator tools
    - story expansion upsell flows
    """

    def __init__(
        self,
        *,
        llm_orchestrator: LLMOrchestratorService | None = None,
        moderation: ContentModerationService | None = None,
    ) -> None:
        self.llm_orchestrator = llm_orchestrator or LLMOrchestratorService()
        self.moderation = moderation or ContentModerationService()

    async def continue_story(
        self,
        *,
        existing_content: str,
        continuation_instruction: str,
        genre: str,
        tone: str,
        language: str,
        target_word_count: int = 700,
    ) -> dict[str, Any]:
        existing_content = existing_content.strip()
        continuation_instruction = continuation_instruction.strip()

        if len(existing_content) < 100:
            raise DomainError(
                code="STORY_TOO_SHORT_FOR_CONTINUATION",
                message="Existing story content is too short for continuation",
                status_code=400,
            )

        moderation = self.moderation.assess_text(continuation_instruction)
        if moderation["blocked"]:
            raise DomainError(
                code="CONTINUATION_BLOCKED",
                message="Continuation instruction blocked by moderation",
                status_code=400,
            )

        system_prompt = (
            "You are continuing an existing story. "
            "Preserve voice, continuity, pacing, character logic, and narrative structure. "
            f"Genre: {genre}. Tone: {tone}. Language: {language}. "
            f"Continue by about {target_word_count} words. "
            "Do not restart the story. Do not summarize. Continue naturally from the current endpoint."
        )

        user_prompt = (
            f"Existing story:\n{existing_content}\n\n"
            f"Continuation instruction:\n{continuation_instruction}\n\n"
            "Continue the story directly from where it ended."
        )

        result = await self.llm_orchestrator.generate_text(
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            max_tokens=max(900, min(int(target_word_count * 2.1), 5000)),
            temperature=0.8,
        )

        continuation = result["text"].strip()
        if not continuation:
            raise DomainError(
                code="EMPTY_CONTINUATION_OUTPUT",
                message="Provider returned empty continuation",
                status_code=502,
            )

        return {
            "success": True,
            "provider": result["provider"],
            "model": result.get("model"),
            "latency_ms": result.get("latency_ms"),
            "continuation": continuation,
            "moderation": moderation,
        }
