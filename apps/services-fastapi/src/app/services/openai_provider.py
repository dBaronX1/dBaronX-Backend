from __future__ import annotations

from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings


class OpenAIProvider:
    """
    Canonical OpenAI async provider.

    Design:
    - async-first
    - low-overhead chat completions
    - stable normalized output for orchestrator consumption
    """

    def __init__(self) -> None:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured")

        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    async def generate(self, prompt: str, max_tokens: int = 1500) -> dict[str, Any]:
        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=0.8,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a production-grade story generation engine. "
                        "Return polished, readable, safe text only."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )

        content = ""
        if response.choices and response.choices[0].message:
            content = response.choices[0].message.content or ""

        usage = getattr(response, "usage", None)

        return {
            "provider": "openai",
            "model": self.model,
            "content": content.strip(),
            "usage": {
                "prompt_tokens": getattr(usage, "prompt_tokens", None),
                "completion_tokens": getattr(usage, "completion_tokens", None),
                "total_tokens": getattr(usage, "total_tokens", None),
            },
            "raw": response.model_dump() if hasattr(response, "model_dump") else None,
        }
