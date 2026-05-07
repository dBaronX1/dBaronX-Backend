from __future__ import annotations

from importlib import import_module
from typing import Any

from app.core.config import get_settings


class OpenAIProvider:
    """Canonical OpenAI async provider."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        resolved_api_key = api_key or settings.openai_api_key
        if not resolved_api_key:
            raise ValueError("OPENAI_API_KEY is not configured")

        module = import_module("openai")
        self.client = module.AsyncOpenAI(api_key=resolved_api_key)
        self.model = model or settings.openai_model

    async def generate(self, prompt: str, max_tokens: int = 1500) -> dict[str, Any]:
        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=0.8,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": "Return polished, readable, safe text only."},
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content if response.choices else ""
        usage = getattr(response, "usage", None)
        return {
            "provider": "openai",
            "model": self.model,
            "content": (content or "").strip(),
            "usage": {
                "prompt_tokens": getattr(usage, "prompt_tokens", None),
                "completion_tokens": getattr(usage, "completion_tokens", None),
                "total_tokens": getattr(usage, "total_tokens", None),
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
        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=temperature,
            max_tokens=max_output_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return ((response.choices[0].message.content if response.choices else "") or "").strip()
