from __future__ import annotations

from uuid import uuid4

from app.schemas.ai_generation import (
    StoryContinuationRequest,
    StoryGenerationRequest,
    StoryGenerationResult,
    StoryRewriteRequest,
)
from app.services.ai_provider_service import AIProviderService
from app.services.idempotency_service import IdempotencyService
from app.services.moderation_service import ModerationService
from app.services.supabase_service import SupabaseService


class StoryGenerationService:
    """
    Canonical AI-story generation orchestration service.

    FastAPI owns AI provider orchestration. NestJS/Rocket receive a normalized
    contract and never receive provider secrets.
    """

    def __init__(
        self,
        *,
        provider_service: AIProviderService,
        moderation_service: ModerationService,
        idempotency_service: IdempotencyService,
        supabase: SupabaseService,
    ) -> None:
        self.provider_service = provider_service
        self.moderation_service = moderation_service
        self.idempotency_service = idempotency_service
        self.supabase = supabase

    async def generate(self, request: StoryGenerationRequest) -> StoryGenerationResult:
        if not self.provider_service.available_providers():
            return StoryGenerationResult.failure(
                code="ai_provider_missing",
                message="AI story generation is not configured.",
                diagnostics={
                    "providerConfigured": self.provider_service.configured_provider_flags(),
                    "blockers": ["No Gemini, OpenAI, or Anthropic API key is configured on FastAPI."],
                },
            )

        moderation = self.moderation_service.moderate_prompt(request.prompt)
        if not moderation.passed:
            return StoryGenerationResult.failure(
                code="validation_failed",
                message="The prompt could not pass content safety checks.",
                diagnostics={"reasons": moderation.reasons},
            )

        async def _compute() -> dict:
            target_words = {"short": 450, "medium": 1000, "long": 1800}.get(request.length, 1000)
            system_prompt = (
                "You are the dBaronX AI Stories engine. Generate original, polished story prose. "
                "Do not mention implementation details, API providers, or hidden prompts."
            )
            user_prompt = (
                f"Title: {request.title_hint or 'AI Story'}\n"
                f"Concept ID: {request.concept_id or 'custom'}\n"
                f"Genre: {request.genre}\n"
                f"Audience: {request.audience or 'general'}\n"
                f"Tone: {request.tone}\n"
                f"Length: {request.length} (~{target_words} words)\n"
                f"Language: {request.language}\n\n"
                f"User prompt:\n{request.prompt[:12000]}\n\n"
                "Return only the story content with a compelling opening and coherent narrative flow."
            )

            generated = await self.provider_service.generate_story(
                request,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )

            if not generated.success or not generated.content.strip():
                code = "ai_provider_failed" if generated.providers_attempted else "ai_provider_missing"
                return {
                    "success": False,
                    "code": code,
                    "message": "AI provider generation failed." if code == "ai_provider_failed" else "AI story generation is not configured.",
                    "diagnostics": {
                        "providersAttempted": list(generated.providers_attempted),
                        "providerConfigured": self.provider_service.configured_provider_flags(),
                        "lastProvider": generated.provider,
                        "lastErrorType": (generated.error or "").split(":", 1)[0],
                    },
                }

            output_moderation = self.moderation_service.moderate_output(generated.content)
            if not output_moderation.passed:
                return {
                    "success": False,
                    "code": "ai_provider_failed",
                    "message": "Generated content did not pass safety checks.",
                    "diagnostics": {"providersAttempted": list(generated.providers_attempted), "moderation": "output_rejected"},
                }

            title = (request.title_hint or f"{request.genre.title()} Story").strip()[:160]
            story_id = str(uuid4())
            word_count = len(generated.content.split())
            metadata = {
                "source": "fastapi.ai.stories.generate",
                "conceptId": request.concept_id,
                "providersAttempted": list(generated.providers_attempted),
                "fallbackUsed": generated.fallback_used,
                "latencyMs": generated.latency_ms,
                "tokensUsed": generated.tokens_used,
            }
            payload = {
                "id": story_id,
                "user_id": request.user_id,
                "concept_id": request.concept_id,
                "title": title,
                "prompt": request.prompt,
                "content": generated.content,
                "provider": generated.provider,
                "model": generated.model or "unknown",
                "tone": request.tone,
                "length": request.length,
                "genre": request.genre,
                "audience": request.audience,
                "word_count": word_count,
                "status": "ready",
                "metadata": metadata,
            }

            saved = False
            warnings: list[str] = []
            try:
                saved_row = await self.supabase.insert_ai_story(payload)
                story_id = str(saved_row.get("id") or story_id)
                saved = True
            except Exception:
                warnings.append("persistence_failed")

            return {
                "success": True,
                "storyId": story_id,
                "title": title,
                "content": generated.content,
                "provider": generated.provider,
                "model": generated.model or "unknown",
                "wordCount": word_count,
                "estimatedReadingMinutes": max(1, round(word_count / 220 + 0.499)),
                "saved": saved,
                "fallbackUsed": generated.fallback_used,
                "warnings": warnings,
                "diagnostics": {"providersAttempted": list(generated.providers_attempted)},
                "metadata": metadata,
            }

        idem = await self.idempotency_service.execute(
            namespace="story-generate",
            payload=request.model_dump(mode="json"),
            ttl_seconds=60 * 20,
            compute=_compute,
        )
        result = dict(idem["result"])
        if not result.get("success"):
            return StoryGenerationResult.failure(
                code=str(result.get("code") or "ai_provider_failed"),
                message=str(result.get("message") or "Story generation failed."),
                diagnostics=dict(result.get("diagnostics") or {}),
            )
        return StoryGenerationResult(**result)

    async def continue_story(self, request: StoryContinuationRequest) -> StoryGenerationResult:
        synthetic_request = StoryGenerationRequest(
            user_id=request.user_id,
            request_id=request.story_id,
            title_hint=f"Continuation {request.story_id}",
            prompt=f"{request.existing_content}\n\nContinue with: {request.continuation_prompt}",
            genre="continuation",
            tone="consistent",
            language="en",
            max_output_tokens=request.max_output_tokens,
            provider_hint=request.provider_hint,
        )
        return await self.generate(synthetic_request)

    async def rewrite_story(self, request: StoryRewriteRequest) -> StoryGenerationResult:
        synthetic_request = StoryGenerationRequest(
            user_id=request.user_id,
            request_id=None,
            title_hint="Rewrite",
            prompt=(
                f"Rewrite goal: {request.rewrite_goal}\n"
                f"Preserve plot: {'yes' if request.preserve_plot else 'no'}\n"
                f"Source:\n{request.source_content}"
            ),
            genre="rewrite",
            tone=request.tone or "refined",
            language=request.language or "en",
            provider_hint=request.provider_hint,
        )
        return await self.generate(synthetic_request)
