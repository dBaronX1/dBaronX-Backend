from __future__ import annotations

from app.schemas.story_generation import StoryRewriteRequest, StoryRewriteResponse
from app.services.content_moderation_service import ContentModerationService
from app.services.llm_orchestrator_service import LLMOrchestratorService
from app.services.prompt_policy_service import PromptPolicyService
from app.services.story_metadata_service import StoryMetadataService


class StoryRewriteService:
    """
    Production rewrite service for:
    - continue story
    - rewrite for tone/clarity
    - shorten or expand
    - keep editorial safety consistent
    """

    def __init__(
        self,
        *,
        prompt_policy_service: PromptPolicyService,
        llm_orchestrator_service: LLMOrchestratorService,
        content_moderation_service: ContentModerationService,
        story_metadata_service: StoryMetadataService,
    ) -> None:
        self.prompt_policy = prompt_policy_service
        self.llm = llm_orchestrator_service
        self.content_moderation = content_moderation_service
        self.story_metadata = story_metadata_service

    async def rewrite(self, payload: StoryRewriteRequest) -> StoryRewriteResponse:
        if not payload.content.strip():
            raise ValueError("content_required")

        if payload.instruction:
            self.prompt_policy.validate(payload.instruction)

        rewrite_prompt = self._build_prompt(payload)

        llm_result = await self.llm.generate(
            prompt=rewrite_prompt,
            max_tokens=payload.max_tokens,
            preferred_provider=payload.preferred_provider,
        )

        moderation = self.content_moderation.assess_text(llm_result.content)
        if not moderation["allowed"]:
            raise ValueError("rewritten_story_failed_moderation")

        excerpt = self.story_metadata.generate_excerpt(llm_result.content, length=220)
        tags = self.story_metadata.generate_tags(
            content=llm_result.content,
            genre=payload.genre,
            tone=payload.tone,
            language=payload.language,
        )

        return StoryRewriteResponse(
            success=True,
            provider=llm_result.provider,
            model=llm_result.model,
            content=llm_result.content,
            excerpt=excerpt,
            tags=tags,
            moderation=moderation,
            metadata={
                "mode": payload.mode,
                "original_length": len(payload.content),
                "rewritten_length": len(llm_result.content),
            },
        )

    def _build_prompt(self, payload: StoryRewriteRequest) -> str:
        mode_instruction_map = {
            "rewrite": "Rewrite the story while improving clarity, quality, and immersion.",
            "continue": "Continue the story naturally from where it ended.",
            "shorten": "Shorten the story while preserving the strongest ideas.",
            "expand": "Expand the story with stronger detail, tension, and character depth.",
        }

        mode_instruction = mode_instruction_map.get(payload.mode, mode_instruction_map["rewrite"])

        parts = [
            "You are an elite fiction editor and story enhancement model.",
            mode_instruction,
            f"Genre: {payload.genre}",
            f"Tone: {payload.tone}",
            f"Language: {payload.language}",
        ]

        if payload.instruction:
            parts.append(f"Specific editorial instruction: {payload.instruction.strip()}")

        parts.extend(
            [
                "",
                "Original content:",
                payload.content,
            ]
        )

        return "\n".join(parts)
