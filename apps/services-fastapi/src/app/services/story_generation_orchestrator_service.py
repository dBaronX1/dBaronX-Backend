from __future__ import annotations

from typing import Any

from app.core.exceptions import DomainError
from app.services.content_moderation_service import ContentModerationService
from app.services.llm_orchestrator_service import LLMOrchestratorService
from app.services.prompt_policy_service import PromptPolicyService
from app.services.story_metadata_service import StoryMetadataService
from app.services.story_persistence_service import StoryPersistenceService


class StoryGenerationOrchestratorService:
    """
    Canonical AI-story generation orchestrator for the dBaronX intelligence layer.

    This service coordinates:
    - prompt policy enforcement
    - pre-generation moderation
    - multi-provider generation fallback
    - metadata enrichment
    - persistence of jobs, stories, and moderation logs

    It is intentionally subsystem-aware so the generated output can be consumed by:
    - AI Stories frontend
    - affiliate promotion tooling
    - watch-to-earn teaser/ad generation
    - NestJS creator dashboards and monetization flows
    """

    def __init__(
        self,
        *,
        llm_orchestrator: LLMOrchestratorService | None = None,
        prompt_policy: PromptPolicyService | None = None,
        moderation: ContentModerationService | None = None,
        metadata_service: StoryMetadataService | None = None,
        persistence: StoryPersistenceService | None = None,
    ) -> None:
        self.llm_orchestrator = llm_orchestrator or LLMOrchestratorService()
        self.prompt_policy = prompt_policy or PromptPolicyService()
        self.moderation = moderation or ContentModerationService()
        self.metadata_service = metadata_service or StoryMetadataService()
        self.persistence = persistence or StoryPersistenceService()

    async def generate(
        self,
        *,
        user_id: str | None,
        prompt: str,
        genre: str,
        tone: str,
        language: str,
        title_hint: str | None = None,
        target_word_count: int = 1200,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        job = await self.persistence.create_generation_job(
            user_id=user_id,
            prompt=prompt,
            genre=genre,
            tone=tone,
            language=language,
            metadata=metadata or {},
        )
        job_id = job.get("id")

        try:
            await self.persistence.mark_job_running(
                job_id=str(job_id),
                metadata={
                    "stage": "policy_and_moderation",
                    "genre": genre,
                    "tone": tone,
                    "language": language,
                },
            )

            policy_result = self.prompt_policy.evaluate_story_prompt(
                prompt=prompt,
                genre=genre,
                tone=tone,
                language=language,
            )
            if not policy_result["allowed"]:
                await self.persistence.mark_job_failed(
                    job_id=str(job_id),
                    error_message=policy_result["reason"],
                    metadata={"policy": policy_result},
                )
                raise DomainError(
                    code="STORY_PROMPT_BLOCKED",
                    message=policy_result["reason"],
                    status_code=400,
                )

            moderation = self.moderation.assess_text(prompt)
            await self.persistence.save_moderation_result(
                story_id=None,
                user_id=user_id,
                allowed=not moderation["blocked"],
                flags=moderation["flags"],
                metadata={
                    "phase": "pre_generation_prompt_check",
                    "risk_score": moderation["risk_score"],
                    "review_required": moderation["review_required"],
                },
            )

            if moderation["blocked"]:
                await self.persistence.mark_job_failed(
                    job_id=str(job_id),
                    error_message="Prompt blocked by moderation",
                    metadata={"moderation": moderation},
                )
                raise DomainError(
                    code="STORY_MODERATION_BLOCKED",
                    message="Prompt blocked by moderation",
                    status_code=400,
                )

            system_prompt = self._build_system_prompt(
                genre=genre,
                tone=tone,
                language=language,
                target_word_count=target_word_count,
            )

            provider_result = await self.llm_orchestrator.generate_text(
                user_prompt=self._build_user_prompt(
                    prompt=prompt,
                    title_hint=title_hint,
                    genre=genre,
                    tone=tone,
                    language=language,
                    target_word_count=target_word_count,
                ),
                system_prompt=system_prompt,
                max_tokens=self._resolve_token_budget(target_word_count),
                temperature=0.85,
            )

            raw_content = provider_result["text"].strip()
            if not raw_content:
                raise DomainError(
                    code="EMPTY_STORY_OUTPUT",
                    message="Provider returned empty story output",
                    status_code=502,
                )

            story_metadata = self.metadata_service.build_from_story(
                content=raw_content,
                prompt=prompt,
                genre=genre,
                tone=tone,
                language=language,
                title_hint=title_hint,
            )

            story_record = await self.persistence.save_story_record(
                user_id=user_id,
                title=story_metadata["title"],
                slug=story_metadata["slug"],
                prompt=prompt,
                content=raw_content,
                excerpt=story_metadata["excerpt"],
                genre=genre,
                tone=tone,
                language=language,
                provider=provider_result["provider"],
                tags=story_metadata["tags"],
                metadata={
                    **(metadata or {}),
                    "provider_model": provider_result.get("model"),
                    "provider_latency_ms": provider_result.get("latency_ms"),
                    "prompt_policy": policy_result,
                    "pre_generation_moderation": moderation,
                    "word_count_target": target_word_count,
                    "actual_word_count": story_metadata["word_count"],
                    "discovery_signals": story_metadata["discovery_signals"],
                    "promotion_hints": story_metadata["promotion_hints"],
                },
            )

            await self.persistence.mark_job_completed(
                job_id=str(job_id),
                metadata={
                    "story_id": story_record.get("id"),
                    "provider": provider_result["provider"],
                    "model": provider_result.get("model"),
                    "word_count": story_metadata["word_count"],
                },
            )

            return {
                "success": True,
                "job": job,
                "story": story_record,
                "provider": {
                    "name": provider_result["provider"],
                    "model": provider_result.get("model"),
                    "latency_ms": provider_result.get("latency_ms"),
                },
                "metadata": story_metadata,
                "moderation": moderation,
            }

        except DomainError:
            raise
        except Exception as exc:
            if job_id:
                await self.persistence.mark_job_failed(
                    job_id=str(job_id),
                    error_message=str(exc),
                    metadata={"unhandled": True},
                )
            raise DomainError(
                code="STORY_GENERATION_FAILED",
                message="Story generation failed",
                status_code=500,
                details={"reason": str(exc)},
            ) from exc

    def _build_system_prompt(
        self,
        *,
        genre: str,
        tone: str,
        language: str,
        target_word_count: int,
    ) -> str:
        return (
            "You are an elite fiction and narrative writing engine for the dBaronX ecosystem. "
            "Produce polished, coherent, commercially viable story output. "
            f"Genre: {genre}. Tone: {tone}. Language: {language}. "
            f"Target length: approximately {target_word_count} words. "
            "Requirements: strong hook, clean pacing, emotional coherence, readable structure, "
            "high narrative clarity, no policy-violating content, no meta-commentary, "
            "and no explanation outside the story itself."
        )

    def _build_user_prompt(
        self,
        *,
        prompt: str,
        title_hint: str | None,
        genre: str,
        tone: str,
        language: str,
        target_word_count: int,
    ) -> str:
        title_line = f"Suggested title direction: {title_hint}\n" if title_hint else ""
        return (
            f"{title_line}"
            f"Prompt:\n{prompt}\n\n"
            f"Write a {genre} story in {language} with a {tone} tone. "
            f"Target approximately {target_word_count} words. "
            "Start strongly, maintain continuity, and end in a satisfying way."
        )

    def _resolve_token_budget(self, target_word_count: int) -> int:
        # Roughly 1.3–1.5 tokens per word for English prose, larger buffer for multilingual output.
        base = int(target_word_count * 2.2)
        return max(1200, min(base, 7000))
