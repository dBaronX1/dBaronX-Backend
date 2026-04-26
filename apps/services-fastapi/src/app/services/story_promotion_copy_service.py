from __future__ import annotations

import time
from typing import Any

from app.services.anthropic_provider import AnthropicProvider
from app.services.gemini_provider import GeminiProvider
from app.services.openai_provider import OpenAIProvider
from app.services.prompt_policy_service import PromptPolicyService
from app.services.story_metadata_assembly_service import StoryMetadataAssemblyService
from app.services.story_moderation_service import StoryModerationService


class StoryPromotionCopyService:
    """
    Canonical promotion copy engine for AI Stories.

    Generates:
    - story landing copy
    - ad teaser lines
    - affiliate CTA text
    - mobile-safe promotional snippets
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
        prompt: str | None = None,
        language: str | None = None,
        campaign_type: str = "discovery",
        max_lines: int = 5,
    ) -> dict[str, Any]:
        started_at = time.perf_counter()

        safe_title = self._normalize_required(title, "title")
        safe_content = self._normalize_required(content, "content")
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

        final_prompt = self.prompt_policy_service.enforce_generation_prompt_policy(
            prompt=self._build_prompt(
                title=safe_title,
                metadata=metadata,
                content=safe_content,
                campaign_type=campaign_type,
                language=language,
                max_lines=max_lines,
            ),
            max_prompt_chars=32000,
        )["prompt"]

        providers = [
            ("anthropic", self.anthropic_provider),
            ("openai", self.openai_provider),
            ("gemini", self.gemini_provider),
        ]
        last_error: Exception | None = None

        for provider_name, provider in providers:
            try:
                raw_output = await provider.generate_text(
                    prompt=final_prompt,
                    temperature=0.55,
                    max_output_tokens=900,
                )
                structured = self._parse_output(raw_output)
                return {
                    "success": True,
                    "provider": provider_name,
                    "copy": structured,
                    "latency_ms": int((time.perf_counter() - started_at) * 1000),
                    "moderation": moderation,
                    "meta": {
                        "campaign_type": campaign_type,
                        "genre": metadata.get("genre"),
                        "tone": metadata.get("tone"),
                        "language": metadata.get("language"),
                    },
                }
            except Exception as exc:  # noqa: BLE001
                last_error = exc

        fallback = self._fallback_copy(
            title=safe_title,
            metadata=metadata,
            campaign_type=campaign_type,
        )
        return {
            "success": True,
            "provider": "deterministic_fallback",
            "copy": fallback,
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
            "moderation": moderation,
            "meta": {
                "campaign_type": campaign_type,
                "genre": metadata.get("genre"),
                "tone": metadata.get("tone"),
                "language": metadata.get("language"),
                "fallback_reason": str(last_error) if last_error else "Provider unavailable",
            },
        }

    def _build_prompt(
        self,
        *,
        title: str,
        metadata: dict[str, Any],
        content: str,
        campaign_type: str,
        language: str | None,
        max_lines: int,
    ) -> str:
        return (
            "You are dBaronX AI Stories promotion copy engine.\n"
            "Return plain text in this exact structure:\n"
            "headline: ...\n"
            "subheadline: ...\n"
            "cta: ...\n"
            "affiliate_cta: ...\n"
            "ad_lines:\n"
            "- ...\n"
            "- ...\n"
            f"Use no more than {max_lines} ad_lines.\n"
            "Do not include markdown fences.\n"
            "Write concise, conversion-focused, mobile-friendly copy.\n"
            f"Campaign type: {campaign_type}\n"
            f"Language: {language or metadata.get('language') or 'en'}\n"
            f"Title: {title}\n"
            f"Genre: {metadata.get('genre')}\n"
            f"Tone: {metadata.get('tone')}\n"
            f"Audience: {metadata.get('audience')}\n"
            f"Summary: {metadata.get('summary')}\n"
            f"Excerpt: {metadata.get('excerpt')}\n"
            f"Story content:\n{content[:8000]}"
        )

    def _parse_output(self, raw_output: str) -> dict[str, Any]:
        lines = [line.strip() for line in raw_output.splitlines() if line.strip()]
        result = {
            "headline": "",
            "subheadline": "",
            "cta": "",
            "affiliate_cta": "",
            "ad_lines": [],
        }
        in_ad_lines = False

        for line in lines:
            lower = line.lower()
            if lower.startswith("headline:"):
                result["headline"] = line.split(":", 1)[1].strip()
                in_ad_lines = False
            elif lower.startswith("subheadline:"):
                result["subheadline"] = line.split(":", 1)[1].strip()
                in_ad_lines = False
            elif lower.startswith("cta:"):
                result["cta"] = line.split(":", 1)[1].strip()
                in_ad_lines = False
            elif lower.startswith("affiliate_cta:"):
                result["affiliate_cta"] = line.split(":", 1)[1].strip()
                in_ad_lines = False
            elif lower.startswith("ad_lines:"):
                in_ad_lines = True
            elif in_ad_lines and line.startswith("-"):
                result["ad_lines"].append(line[1:].strip())

        if not result["headline"]:
            result["headline"] = "Discover a story worth following."
        if not result["subheadline"]:
            result["subheadline"] = "Read, share, and promote standout AI-crafted storytelling."
        if not result["cta"]:
            result["cta"] = "Read now"
        if not result["affiliate_cta"]:
            result["affiliate_cta"] = "Share and earn on every strong referral"
        if not result["ad_lines"]:
            result["ad_lines"] = [result["headline"], result["subheadline"]]

        result["ad_lines"] = result["ad_lines"][:5]
        return result

    def _fallback_copy(
        self,
        *,
        title: str,
        metadata: dict[str, Any],
        campaign_type: str,
    ) -> dict[str, Any]:
        genre = metadata.get("genre", "story")
        tone = metadata.get("tone", "engaging")
        return {
            "headline": f"{title} — a {tone} {genre} experience",
            "subheadline": "Open the story, follow the journey, and discover what happens next.",
            "cta": "Start reading",
            "affiliate_cta": "Recommend this story and earn from real engagement",
            "ad_lines": [
                f"Discover {title}.",
                f"A {tone} {genre} story built for modern readers.",
                "Open now and follow the next chapter.",
                f"Campaign mode: {campaign_type}.",
            ],
        }

    def _normalize_required(self, value: str, field_name: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
