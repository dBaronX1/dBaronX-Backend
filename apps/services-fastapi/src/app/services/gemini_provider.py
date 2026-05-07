from __future__ import annotations

from importlib import import_module
from typing import Any

from app.core.config import get_settings


class GeminiProvider:
    """Canonical Gemini provider."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        resolved_api_key = api_key or settings.gemini_api_key
        if not resolved_api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        genai = import_module("google.generativeai")
        genai.configure(api_key=resolved_api_key)
        self.model_name = model or settings.gemini_model
        self.model = genai.GenerativeModel(self.model_name)

    async def generate(self, prompt: str, max_tokens: int = 1500) -> dict[str, Any]:
        response = await self.model.generate_content_async(
            prompt,
            generation_config={"temperature": 0.8, "max_output_tokens": max_tokens},
        )
        return {
            "provider": "gemini",
            "model": self.model_name,
            "content": (getattr(response, "text", None) or "").strip(),
            "usage": None,
            "raw": response.to_dict() if hasattr(response, "to_dict") else None,
        }

    async def generate_text(
        self,
        *,
        prompt: str,
        temperature: float = 0.8,
        max_output_tokens: int = 1500,
    ) -> str:
        response = await self.model.generate_content_async(
            prompt,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
            },
        )
        return (getattr(response, "text", None) or "").strip()
