from __future__ import annotations

import google.generativeai as genai

from app.core.config import get_settings
from app.providers.base import AIProviderResponse, BaseAIProvider


class GoogleProvider(BaseAIProvider):
    provider_name = "google"

    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.google_model
        genai.configure(api_key=settings.google_api_key)

    async def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        max_output_tokens: int,
        temperature: float,
    ) -> AIProviderResponse:
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }

        model = genai.GenerativeModel(
            model_name=self.model,
            generation_config=generation_config,
            system_instruction=system_prompt,
        )

        response = await model.generate_content_async(user_prompt)

        return AIProviderResponse(
            provider=self.provider_name,
            model=self.model,
            content=(response.text or "").strip(),
            usage={},
        )
