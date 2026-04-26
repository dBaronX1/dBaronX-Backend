from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(slots=True)
class AIProviderResponse:
    provider: str
    model: str
    content: str
    usage: dict


class BaseAIProvider(ABC):
    provider_name: str

    @abstractmethod
    async def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        max_output_tokens: int,
        temperature: float,
    ) -> AIProviderResponse:
        raise NotImplementedError
