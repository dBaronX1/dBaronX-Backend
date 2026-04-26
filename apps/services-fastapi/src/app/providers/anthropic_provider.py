from __future__ import annotations

import anthropic

from app.core.config import get_settings
from app.providers.base import AIProviderResponse, BaseAIProvider


class AnthropicProvider(BaseAIProvider):
    provider_name = "anthropic"

    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.anthropic_model
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        max_output_tokens: int,
        temperature: float,
    ) -> AIProviderResponse:
        response = await self._client.messages.create(
            model=self.model,
            system=system_prompt,
            temperature=temperature,
            max_tokens=max_output_tokens,
            messages=[
                {
                    "role": "user",
                    "content": user_prompt,
                }
            ],
        )

        parts: list[str] = []
        for block in response.content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)

        usage = {
            "input_tokens": getattr(response.usage, "input_tokens", None),
            "output_tokens": getattr(response.usage, "output_tokens", None),
        }

        return AIProviderResponse(
            provider=self.provider_name,
            model=self.model,
            content="\n".join(parts).strip(),
            usage=usage,
        )
