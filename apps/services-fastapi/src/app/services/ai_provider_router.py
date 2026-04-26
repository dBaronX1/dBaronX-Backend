from __future__ import annotations

from typing import Protocol

from app.core.config import Settings, get_settings
from app.schemas.ai_generation import AIGenerationRequest, AIGenerationResult, AIGenerationUsage


class AIProviderAdapter(Protocol):
    name: str

    async def generate(self, payload: AIGenerationRequest) -> AIGenerationResult:
        ...


class AnthropicAdapter:
    name = "anthropic"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def generate(self, payload: AIGenerationRequest) -> AIGenerationResult:
        content = self._build_content(payload, "Anthropic")
        return AIGenerationResult(
            ok=True,
            task=payload.task,
            provider="anthropic",
            fallback_used=False,
            title=payload.title,
            content=content,
            excerpt=content[:280],
            tags=self._tags(payload),
            usage=AIGenerationUsage(input_tokens=500, output_tokens=900, total_tokens=1400),
            metadata={"model": self.settings.ai_anthropic_model},
        )

    @staticmethod
    def _build_content(payload: AIGenerationRequest, source: str) -> str:
        return (
            f"[{source}] {payload.task}\n\n"
            f"Genre: {payload.genre or 'general'}\n"
            f"Tone: {payload.tone or 'balanced'}\n"
            f"Language: {payload.language}\n\n"
            f"{payload.prompt}"
        )

    @staticmethod
    def _tags(payload: AIGenerationRequest) -> list[str]:
        tags = [payload.task.replace("_", "-"), payload.language]
        if payload.genre:
            tags.append(payload.genre.lower())
        if payload.tone:
            tags.append(payload.tone.lower())
        return tags[:8]


class OpenAIAdapter:
    name = "openai"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def generate(self, payload: AIGenerationRequest) -> AIGenerationResult:
        content = AnthropicAdapter._build_content(payload, "OpenAI")
        return AIGenerationResult(
            ok=True,
            task=payload.task,
            provider="openai",
            fallback_used=False,
            title=payload.title,
            content=content,
            excerpt=content[:280],
            tags=AnthropicAdapter._tags(payload),
            usage=AIGenerationUsage(input_tokens=520, output_tokens=880, total_tokens=1400),
            metadata={"model": self.settings.ai_openai_model},
        )


class GeminiAdapter:
    name = "gemini"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def generate(self, payload: AIGenerationRequest) -> AIGenerationResult:
        content = AnthropicAdapter._build_content(payload, "Gemini")
        return AIGenerationResult(
            ok=True,
            task=payload.task,
            provider="gemini",
            fallback_used=False,
            title=payload.title,
            content=content,
            excerpt=content[:280],
            tags=AnthropicAdapter._tags(payload),
            usage=AIGenerationUsage(input_tokens=480, output_tokens=920, total_tokens=1400),
            metadata={"model": self.settings.ai_gemini_model},
        )


class AIProviderRouter:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.providers: dict[str, AIProviderAdapter] = {
            "anthropic": AnthropicAdapter(self.settings),
            "openai": OpenAIAdapter(self.settings),
            "gemini": GeminiAdapter(self.settings),
        }

    def resolve_order(self, payload: AIGenerationRequest) -> list[AIProviderAdapter]:
        ordered: list[AIProviderAdapter] = []

        if payload.preferred_provider:
            preferred = self.providers.get(payload.preferred_provider)
            if preferred:
                ordered.append(preferred)

        for provider_name in payload.fallback_providers:
            provider = self.providers.get(provider_name)
            if provider and provider not in ordered:
                ordered.append(provider)

        if not ordered:
            ordered.append(self.providers["anthropic"])

        return ordered
