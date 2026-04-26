from __future__ import annotations

import time
from typing import Any

from app.services.anthropic_provider import AnthropicProvider
from app.services.gemini_provider import GeminiProvider
from app.services.openai_provider import OpenAIProvider
from app.services.prompt_policy_service import PromptPolicyService
from app.services.story_metadata_assembly_service import StoryMetadataAssemblyService
from app.services.story_moderation_service import StoryModerationService


class StoryAffiliateCopyService:
    """
    Canonical affiliate copy engine.

    Specialized for:
    - creator referrals
    - affiliate landing snippets
    - mobile messenger share text
    - short-form conversion copy
    """

    def __init__(
        self,
        *,
        prompt_policy_service: PromptPolicyService | None = None,
        moderation_service: StoryModerationService | None = None,
        metadata_service: StoryMetadataAssemblyService | None = None,
        openai_provider: OpenAIProvider | None = None,
        anthropic_provider: AnthropicProvider | None = None,
        gemini_provider: GeminiProvider | None = None,
    ) -> None:
        self.prompt_policy_service = prompt_policy_service or PromptPolicyService()
        self.moderation_service = moderation_service or StoryModerationService()
        self.metadata_service = metadata_service or StoryMetadataAssemblyService()
        self.openai_provider = openai_provider or OpenAIProvider()
        self.anthropic_provider = anthropic_provider or AnthropicProvider()
        self.gemini_provider = gemini_provider or GeminiProvider()

    async def generate(
        self,
        *,
        title: str,
        content: str,
        share_channel: str = "universal",
        language: str | None = None,
        prompt: str | None = None,
    ) -> dict[str, Any]:
        started_at = time.perf_counter()

        safe_title = title.strip()
        safe_content = content.strip()

        if not safe_title:
            raise ValueError("title is required")
        if not safe_content:
            raise ValueError("content is required")

        moderation = self.moderation_service.moderate(content=safe_content)
        if moderation["blocked"]:
            return {
                "success": False,
                "provider": "blocked",
                "copy": {},
                "latency_ms": int((time.perf_counter() - started_at) * 1000),
                "moderation": moderation,
                "error": "Content blocked by moderation policy",
            }

        metadata_bundle = await self.metadata_service.assemble(
            content=safe_content,
            prompt=prompt,
            title=safe_title,
            language=language,
        )
        metadata = metadata_bundle["metadata"]

        prompt_text = self.prompt_policy_service.enforce_generation_prompt_policy(
            prompt=self._build_prompt(
                title=safe_title,
                metadata=metadata,
                share_channel=share_channel,
                language=language,
            ),
            max_prompt_chars=24000,
        )["prompt"]

        providers = [
            ("anthropic", self.anthropic_provider),
            ("openai", self.openai_provider),
            ("gemini", self.gemini_provider),
        ]
        last_error: Exception | None = None

        for provider_name, provider in providers:
            try:
                raw = await provider.generate_text(
                    prompt=prompt_text,
                    temperature=0.5,
                    max_output_tokens=600,
                )
                parsed = self._parse_output(raw)
                return {
                    "success": True,
                    "provider": provider_name,
                    "copy": parsed,
                    "latency_ms": int((time.perf_counter() - started_at) * 1000),
                    "moderation": moderation,
                    "meta": {
                        "share_channel": share_channel,
                        "genre": metadata.get("genre"),
                        "tone": metadata.get("tone"),
                        "language": metadata.get("language"),
                    },
                }
            except Exception as exc:  # noqa: BLE001
                last_error = exc

        return {
            "success": True,
            "provider": "deterministic_fallback",
            "copy": self._fallback_copy(
                title=safe_title,
                metadata=metadata,
                share_channel=share_channel,
            ),
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
            "moderation": moderation,
            "meta": {
                "share_channel": share_channel,
                "fallback_reason": str(last_error) if last_error else "Provider unavailable",
            },
        }

    def _build_prompt(
        self,
        *,
        title: str,
        metadata: dict[str, Any],
        share_channel: str,
        language: str | None,
    ) -> str:
        return (
            "You are dBaronX AI Stories affiliate copy engine.\n"
            "Return plain text only in this structure:\n"
            "headline: ...\n"
            "share_caption: ...\n"
            "cta: ...\n"
            "short_pitch: ...\n"
            "Do not include markdown fences.\n"
            "Keep copy mobile-friendly and conversion-focused.\n"
            f"Share channel: {share_channel}\n"
            f"Language: {language or metadata.get('language') or 'en'}\n"
            f"Title: {title}\n"
            f"Genre: {metadata.get('genre')}\n"
            f"Tone: {metadata.get('tone')}\n"
            f"Audience: {metadata.get('audience')}\n"
            f"Summary: {metadata.get('summary')}\n"
            f"Excerpt: {metadata.get('excerpt')}\n"
        )

    def _parse_output(self, raw_output: str) -> dict[str, Any]:
        lines = [line.strip() for line in raw_output.splitlines() if line.strip()]
        result = {
            "headline": "",
            "share_caption": "",
            "cta": "",
            "short_pitch": "",
        }

        for line in lines:
            lower = line.lower()
            if lower.startswith("headline:"):
                result["headline"] = line.split(":", 1)[1].strip()
            elif lower.startswith("share_caption:"):
                result["share_caption"] = line.split(":", 1)[1].strip()
            elif lower.startswith("cta:"):
                result["cta"] = line.split(":", 1)[1].strip()
            elif lower.startswith("short_pitch:"):
                result["short_pitch"] = line.split(":", 1)[1].strip()

        if not result["headline"]:
            result["headline"] = "A story worth sharing"
        if not result["share_caption"]:
            result["share_caption"] = "Open this story and follow what happens next."
        if not result["cta"]:
            result["cta"] = "Read and share"
        if not result["short_pitch"]:
            result["short_pitch"] = result["share_caption"]

        return result

    def _fallback_copy(
        self,
        *,
        title: str,
        metadata: dict[str, Any],
        share_channel: str,
    ) -> dict[str, Any]:
        return {
            "headline": f"Share {title} with readers who love {metadata.get('genre', 'great stories')}",
            "share_caption": "Open the story, explore the world, and pass it on to another reader.",
            "cta": "Read and recommend",
            "short_pitch": f"A {metadata.get('tone', 'strong')} story built for {share_channel} sharing.",
        }
