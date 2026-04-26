from __future__ import annotations

from typing import Any

from anthropic import AsyncAnthropic

from app.core.config import settings


class AnthropicProvider:
    """
    Canonical Anthropic provider.
    Primary premium path for high-quality longform outputs.
    """

    def __init__(self) -> None:
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not configured")

        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.ANTHROPIC_MODEL

    async def generate(self, prompt: str, max_tokens: int = 1500) -> dict[str, Any]:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=0.8,
            system=(
                "You are a production-grade story generation engine. "
                "Return polished, readable, safe text only."
            ),
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )

        parts: list[str] = []
        for block in response.content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)

        return {
            "provider": "anthropic",
            "model": self.model,
            "content": "\n".join(parts).strip(),
            "usage": {
                "input_tokens": getattr(response.usage, "input_tokens", None)
                if getattr(response, "usage", None)
                else None,
                "output_tokens": getattr(response.usage, "output_tokens", None)
                if getattr(response, "usage", None)
                else None,
            },
            "raw": response.model_dump() if hasattr(response, "model_dump") else None,
        }
