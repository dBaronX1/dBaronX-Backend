from __future__ import annotations

import time
from typing import Any

from app.services.anthropic_provider import AnthropicProvider
from app.services.gemini_provider import GeminiProvider
from app.services.openai_provider import OpenAIProvider
from app.services.prompt_policy_service import PromptPolicyService
from app.services.story_moderation_service import StoryModerationService


class StoryContinueService:
    """
    Continuation engine for creator workflows.

    Supports:
    - continuing drafts
    - preserving tone/arc
    - mobile-safe continuation size control
    - later reuse for chapter expansion and premium generation tiers
    """

    def __init__(
        self,
        *,
        prompt_policy_service: PromptPolicyService | None = None,
        moderation_service: StoryModerationService | None = None,
        openai_provider: OpenAIProvider | None = None,
        anthropic_provider: AnthropicProvider | None = None,
        gemini_provider: GeminiProvider | None = None,
    ) -> None:
        self.prompt_policy_service = prompt_policy_service or PromptPolicyService()
        self.moderation_service = moderation_service or StoryModerationService()
        self.openai_provider = openai_provider or OpenAIProvider()
        self.anthropic_provider = anthropic_provider or AnthropicProvider()
        self.gemini_provider = gemini_provider or GeminiProvider()

    async def continue_story(
        self,
        *,
        content: str,
        continuation_prompt: str | None = None,
        target_words: int = 250,
        language: str | None = None,
        maintain_style: bool = True,
    ) -> dict[str, Any]:
        started_at = time.perf_counter()

        cleaned_content = self._normalize_required(content, "content")
        safe_target_words = max(80, min(target_words, 1200))
        moderation = self.moderation_service.moderate(content=cleaned_content)

        if moderation["blocked"]:
            return {
                "success": False,
                "provider": "blocked",
                "latency_ms": int((time.perf_counter() - started_at) * 1000),
                "continuation": "",
                "error": "Content blocked by moderation policy",
                "moderation": moderation,
            }

        prompt = self._build_prompt(
            content=cleaned_content,
            continuation_prompt=continuation_prompt,
            target_words=safe_target_words,
            language=language,
            maintain_style=maintain_style,
        )

        policy = self.prompt_policy_service.enforce_generation_prompt_policy(
            prompt=prompt,
            max_prompt_chars=32000,
        )
        final_prompt = policy["prompt"]

        providers = [
            ("anthropic", self.anthropic_provider),
            ("openai", self.openai_provider),
            ("gemini", self.gemini_provider),
        ]

        last_error: Exception | None = None
        for provider_name, provider in providers:
            try:
                output = await provider.generate_text(
                    prompt=final_prompt,
                    temperature=0.8,
                    max_output_tokens=self._max_tokens_for_target_words(safe_target_words),
                )
                continuation = self._clean_output(output)
                post_moderation = self.moderation_service.moderate(content=continuation)
                return {
                    "success": True,
                    "provider": provider_name,
                    "latency_ms": int((time.perf_counter() - started_at) * 1000),
                    "continuation": continuation,
                    "moderation": post_moderation,
                    "meta": {
                        "target_words": safe_target_words,
                        "language": language,
                        "maintain_style": maintain_style,
                    },
                }
            except Exception as exc:  # noqa: BLE001
                last_error = exc

        return {
            "success": False,
            "provider": "fallback_failure",
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
            "continuation": "",
            "moderation": moderation,
            "error": str(last_error) if last_error else "Continuation failed",
        }

    def _build_prompt(
        self,
        *,
        content: str,
        continuation_prompt: str | None,
        target_words: int,
        language: str | None,
        maintain_style: bool,
    ) -> str:
        rules = [
            f"Continue the story for approximately {target_words} words.",
            "Do not restart the story.",
            "Preserve narrative coherence and causal continuity.",
            "Return only the continuation text.",
        ]
        if maintain_style:
            rules.append("Maintain the established voice, pacing, and story style.")
        if continuation_prompt:
            rules.append(f"Use this continuation guidance: {continuation_prompt}")
        if language:
            rules.append(f"Write in language: {language}.")

        return (
            "You are dBaronX AI Stories continuation engine.\n"
            + "\n".join(f"- {rule}" for rule in rules)
            + f"\n\nExisting story:\n{content}"
        )

    def _normalize_required(self, value: str, field_name: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned

    def _clean_output(self, text: str) -> str:
        return text.strip().strip("`").strip()

    def _max_tokens_for_target_words(self, target_words: int) -> int:
        approx = int(target_words * 1.8)
        return max(300, min(approx, 2600))
