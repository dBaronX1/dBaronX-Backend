from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class LLMGenerationResult:
    provider: str
    model: str
    content: str
    raw: dict[str, Any]


class LLMOrchestratorService:
    """
    Canonical provider orchestrator for dBaronX FastAPI intelligence layer.

    Responsibilities:
    - stable provider ordering
    - resilient fallback
    - single output contract for NestJS / frontend / Telegram consumers
    - future-safe extension for moderation, streaming, retry policy
    """

    def __init__(
        self,
        *,
        anthropic_provider: Any | None = None,
        openai_provider: Any | None = None,
        gemini_provider: Any | None = None,
    ) -> None:
        self.anthropic_provider = anthropic_provider
        self.openai_provider = openai_provider
        self.gemini_provider = gemini_provider

    async def generate(
        self,
        *,
        prompt: str,
        max_tokens: int = 1600,
        preferred_provider: str | None = None,
    ) -> LLMGenerationResult:
        ordered = self._build_order(preferred_provider)

        errors: list[dict[str, str]] = []

        for provider_name, provider in ordered:
            if provider is None:
                continue

            try:
                result = await provider.generate(prompt=prompt, max_tokens=max_tokens)
                content = str(result.get("content") or "").strip()
                if not content:
                    raise ValueError("empty_provider_content")

                return LLMGenerationResult(
                    provider=str(result.get("provider") or provider_name),
                    model=str(result.get("model") or "unknown"),
                    content=content,
                    raw=result,
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(
                    {
                        "provider": provider_name,
                        "error": exc.__class__.__name__,
                        "message": str(exc),
                    }
                )

        raise RuntimeError(
            {
                "code": "llm_generation_failed",
                "message": "All configured LLM providers failed",
                "errors": errors,
            }
        )

    def _build_order(
        self,
        preferred_provider: str | None,
    ) -> list[tuple[str, Any]]:
        registry = {
            "anthropic": self.anthropic_provider,
            "openai": self.openai_provider,
            "gemini": self.gemini_provider,
        }

        default_order = ["anthropic", "openai", "gemini"]

        if preferred_provider and preferred_provider in registry:
            ordered_names = [preferred_provider] + [
                p for p in default_order if p != preferred_provider
            ]
        else:
            ordered_names = default_order

        return [(name, registry[name]) for name in ordered_names]
