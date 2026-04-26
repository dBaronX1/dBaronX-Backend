from __future__ import annotations

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

    Shared responsibilities:
    - moderation gate
    - provider orchestration
    - normalized result shape
    - persistence hook
    - idempotent generation path
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
        moderation = self.moderation_service.moderate_prompt(request.prompt)
        if not moderation.passed:
            return StoryGenerationResult(
                success=False,
                provider="moderation",
                model="rule-gate",
                title=request.title_hint or "Rejected Request",
                content="",
                excerpt="",
                tags=[],
                moderation_passed=False,
                quality_score=0.0,
                request_id=request.request_id,
                usage={
                    "reasons": moderation.reasons,
                },
            )

        async def _compute() -> dict:
            system_prompt = (
                "You are the dBaronX elite storytelling engine. "
                "Generate polished, coherent, monetizable story output with strong structure."
            )
            user_prompt = (
                f"Genre: {request.genre}\n"
                f"Tone: {request.tone}\n"
                f"Language: {request.language}\n"
                f"Prompt: {request.prompt}\n"
            )

            generated = await self.provider_service.generate_story(
                request,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )

            output_moderation = self.moderation_service.moderate_output(generated.content)
            title = (request.title_hint or f"{request.genre.title()} Story").strip()
            excerpt = generated.content[:280].strip()
            tags = list(
                {
                    request.genre.lower(),
                    request.tone.lower(),
                    request.language.lower(),
                    "ai-story",
                    "dbaronx",
                }
            )

            payload = {
                "user_id": request.user_id,
                "request_id": request.request_id,
                "title": title,
                "content": generated.content,
                "provider": generated.provider,
                "model": generated.model,
                "excerpt": excerpt,
                "tags": tags,
                "moderation_passed": output_moderation.passed,
                "quality_score": 0.84 if output_moderation.passed else 0.0,
                "usage": generated.usage,
            }

            await self.supabase.insert_ai_story(payload)
            return payload

        idem = await self.idempotency_service.execute(
            namespace="story-generate",
            payload=request.model_dump(mode="json"),
            ttl_seconds=60 * 20,
            compute=_compute,
        )
        result = idem["result"]

        return StoryGenerationResult(
            success=True,
            provider=str(result["provider"]),
            model=str(result["model"]),
            title=str(result["title"]),
            content=str(result["content"]),
            excerpt=str(result["excerpt"]),
            tags=list(result["tags"]),
            moderation_passed=bool(result["moderation_passed"]),
            quality_score=float(result["quality_score"]),
            request_id=request.request_id,
            usage=dict(result["usage"]),
        )

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
