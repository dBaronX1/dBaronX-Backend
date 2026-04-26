from __future__ import annotations

import time
from typing import Any

from app.services.anthropic_provider import AnthropicProvider
from app.services.gemini_provider import GeminiProvider
from app.services.openai_provider import OpenAIProvider
from app.services.prompt_policy_service import PromptPolicyService
from app.services.story_metadata_assembly_service import StoryMetadataAssemblyService
from app.services.story_moderation_service import StoryModerationService


class StoryAdCopyService:
    """
    Canonical ad copy engine for story campaigns.

    Supports:
    - watch-to-earn creatives
    - featured story ad units
    - advertiser-side story traffic campaigns
    - compact mobile-first ad payloads
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
        objective: str = "clicks",
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

        policy_prompt = self.prompt_policy_service.enforce_generation_prompt_policy(
            prompt=self._build_prompt(
                title=safe_title,
                objective=objective,
                metadata=metadata,
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
                    prompt=policy_prompt,
                    temperature=0.55,
                    max_output_tokens=700,
                )
                parsed = self._parse_output(raw)
                return {
                    "success": True,
                    "provider": provider_name,
                    "copy": parsed,
                    "latency_ms": int((time.perf_counter() - started_at) * 1000),
                    "moderation": moderation,
                    "meta": {
                        "objective": objective,
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
                objective=objective,
                metadata=metadata,
            ),
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
            "moderation": moderation,
            "meta": {
                "objective": objective,
                "fallback_reason": str(last_error) if last_error else "Provider unavailable",
            },
        }

    def _build_prompt(
        self,
        *,
        title: str,
        objective: str,
        metadata: dict[str, Any],
        language: str | None,
    ) -> str:
        return (
            "You are dBaronX AI Stories ad copy engine.\n"
            "Return plain text only in this structure:\n"
            "headline: ...\n"
            "body: ...\n"
            "cta: ...\n"
            "short_line_1: ...\n"
            "short_line_2: ...\n"
            "Do not include markdown fences.\n"
            "Keep output ad-safe, mobile-first, concise, and conversion-focused.\n"
            f"Objective: {objective}\n"
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
            "body": "",
            "cta": "",
            "short_line_1": "",
            "short_line_2": "",
        }

        for line in lines:
            lower = line.lower()
            if lower.startswith("headline:"):
                result["headline"] = line.split(":", 1)[1].strip()
            elif lower.startswith("body:"):
                result["body"] = line.split(":", 1)[1].strip()
            elif lower.startswith("cta:"):
                result["cta"] = line.split(":", 1)[1].strip()
            elif lower.startswith("short_line_1:"):
                result["short_line_1"] = line.split(":", 1)[1].strip()
            elif lower.startswith("short_line_2:"):
                result["short_line_2"] = line.split(":", 1)[1].strip()

        if not result["headline"]:
            result["headline"] = "Discover a story with momentum."
        if not result["body"]:
            result["body"] = "Open the story, follow the tension, and see why readers keep going."
        if not result["cta"]:
            result["cta"] = "Open story"
        if not result["short_line_1"]:
            result["short_line_1"] = result["headline"]
        if not result["short_line_2"]:
            result["short_line_2"] = result["cta"]

        return result

    def _fallback_copy(
        self,
        *,
        title: str,
        objective: str,
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "headline": f"{title} — a {metadata.get('tone', 'compelling')} story",
            "body": f"Explore this {metadata.get('genre', 'featured')} story built to keep readers engaged.",
            "cta": "Read now",
            "short_line_1": f"Objective: {objective}",
            "short_line_2": "Open the story today",
        }
