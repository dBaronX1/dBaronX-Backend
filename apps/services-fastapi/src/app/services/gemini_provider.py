from __future__ import annotations

from typing import Any

import google.generativeai as genai

from app.core.config import settings


class GeminiProvider:
    """
    Canonical Gemini provider.
    Final fallback path in the dBaronX AI chain.
    """

    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")

        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL
        self.model = genai.GenerativeModel(self.model_name)

    async def generate(self, prompt: str, max_tokens: int = 1500) -> dict[str, Any]:
        response = await self.model.generate_content_async(
            prompt,
            generation_config={
                "temperature": 0.8,
                "max_output_tokens": max_tokens,
            },
        )

        return {
            "provider": "gemini",
            "model": self.model_name,
            "content": (getattr(response, "text", None) or "").strip(),
            "usage": None,
            "raw": response.to_dict() if hasattr(response, "to_dict") else None,
        }
