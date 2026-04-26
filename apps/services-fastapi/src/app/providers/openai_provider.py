from __future__ import annotations

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.providers.base import AIProviderResponse, BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    provider_name = "openai"

    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.openai_model
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        max_output_tokens: int,
        temperature: float,
    ) -> AIProviderResponse:
        response = await self._client.chat.completions.create(
            model=self.model,
            temperature=temperature,
            max_tokens=max_output_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        message = response.choices[0].message.content or ""

        usage = {
            "prompt_tokens": getattr(response.usage, "prompt_tokens", None),
            "completion_tokens": getattr(response.usage, "completion_tokens", None),
            "total_tokens": getattr(response.usage, "total_tokens", None),
        }

        return AIProviderResponse(
            provider=self.provider_name,
            model=self.model,
            content=message,
            usage=usage,
        )
