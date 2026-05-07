from __future__ import annotations

from importlib import import_module
from typing import Any

from app.core.config import get_settings


class AnthropicProvider:
    """Canonical Anthropic provider for long-form AI generation."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        resolved_api_key = api_key or settings.anthropic_api_key
        if not resolved_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")

        module = import_module("anthropic")
        self.client = module.AsyncAnthropic(api_key=resolved_api_key)
        self.model = model or settings.anthropic_model

    async def generate(self, prompt: str, max_tokens: int = 1500) -> dict[str, Any]:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=0.8,
            system=(
                "You are a production-grade story generation engine. "
                "Return polished, readable, safe text only."
            ),
            messages=[{"role": "user", "content": prompt}],
        )

        parts: list[str] = []
        for block in response.content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)

        usage = getattr(response, "usage", None)
        return {
            "provider": "anthropic",
            "model": self.model,
            "content": "\n".join(parts).strip(),
            "usage": {
                "input_tokens": getattr(usage, "input_tokens", None),
                "output_tokens": getattr(usage, "output_tokens", None),
            },
            "raw": response.model_dump() if hasattr(response, "model_dump") else None,
        }

    async def generate_text(
        self,
        *,
        prompt: str,
        temperature: float = 0.8,
        max_output_tokens: int = 1500,
    ) -> str:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_output_tokens,
            temperature=temperature,
            system="Return polished, readable, safe text only.",
            messages=[{"role": "user", "content": prompt}],
        )
        parts = [getattr(block, "text", "") for block in response.content]
        return "\n".join(part for part in parts if part).strip()
