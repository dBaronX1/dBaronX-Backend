from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any, Literal, Optional, cast

import httpx

AiProviderName = Literal["gemini", "openai", "anthropic"]


@dataclass(frozen=True)
class AiProviderResult:
    success: bool
    provider: AiProviderName
    content: str
    model: str | None = None
    latency_ms: float | None = None
    tokens_used: int | None = None
    error: str | None = None
    raw: dict[str, Any] | None = None
    fallback_used: bool = False
    providers_attempted: tuple[str, ...] = ()


@dataclass(frozen=True)
class AiMessage:
    role: Literal["system", "user", "assistant"]
    content: str


class AiProviderService:
    """
    Canonical FastAPI AI provider fallback service for dBaronX.

    Provider priority for AI Stories production generation:
    1. Gemini
    2. OpenAI
    3. Anthropic

    Keys are read server-side only and are never returned in diagnostics.
    """

    def __init__(self) -> None:
        self.timeout_seconds = float(os.getenv("AI_PROVIDER_TIMEOUT_SECONDS", "45"))
        self.gemini_api_key = (
            self._env("GEMINI_API_KEY")
            or self._env("GOOGLE_API_KEY")
            or self._env("GOOGLE_GENERATIVE_AI_API_KEY")
        )
        self.openai_api_key = self._env("OPENAI_API_KEY")
        self.anthropic_api_key = self._env("ANTHROPIC_API_KEY")

        self.gemini_model = self._env("GEMINI_MODEL", "gemini-1.5-pro")
        self.openai_model = self._env("OPENAI_MODEL", "gpt-4o")
        self.anthropic_model = self._env("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

    async def generate_story(
        self,
        request: Any,
        *,
        system_prompt: str,
        user_prompt: str,
    ) -> AiProviderResult:
        provider_hint = str(getattr(request, "provider_hint", "") or "").strip().lower()
        max_tokens = int(getattr(request, "max_output_tokens", 1400) or 1400)
        temperature = float(getattr(request, "temperature", 0.8) or 0.8)
        metadata = dict(getattr(request, "metadata", {}) or {})
        if getattr(request, "user_id", None):
            metadata["userId"] = getattr(request, "user_id")

        messages = [
            AiMessage(role="system", content=system_prompt),
            AiMessage(role="user", content=user_prompt),
        ]
        provider = provider_hint if provider_hint in {"gemini", "openai", "anthropic"} else None
        return await self.complete(
            messages,
            provider=provider,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
            metadata=metadata,
        )

    async def complete(
        self,
        messages: list[dict[str, str]] | list[AiMessage],
        *,
        provider: Optional[AiProviderName] = None,
        temperature: float = 0.7,
        max_tokens: int = 1200,
        metadata: Optional[dict[str, Any]] = None,
    ) -> AiProviderResult:
        normalized_messages = self._normalize_messages(messages)

        if provider:
            result = await self._call_provider(
                provider,
                normalized_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                metadata=metadata or {},
            )
            return AiProviderResult(**{**result.__dict__, "providers_attempted": (provider,)})

        last_error: str | None = None
        attempted: list[str] = []
        for candidate in self.available_providers():
            attempted.append(candidate)
            result = await self._call_provider(
                candidate,
                normalized_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                metadata=metadata or {},
            )

            if result.success and result.content.strip():
                return AiProviderResult(
                    **{
                        **result.__dict__,
                        "fallback_used": len(attempted) > 1,
                        "providers_attempted": tuple(attempted),
                    }
                )

            last_error = result.error or "provider returned empty content"

        return AiProviderResult(
            success=False,
            provider="gemini",
            content="",
            error=last_error or "No AI provider is configured or available.",
            providers_attempted=tuple(attempted),
        )

    def provider_order(self) -> list[AiProviderName]:
        configured_order = [
            item.strip().lower()
            for item in self._env("AI_PROVIDER_ORDER", "gemini,openai,anthropic").split(",")
            if item.strip()
        ]
        ordered: list[AiProviderName] = []
        for provider in configured_order:
            if provider in {"gemini", "openai", "anthropic"} and provider not in ordered:
                ordered.append(cast(AiProviderName, provider))
        for provider in ("gemini", "openai", "anthropic"):
            if provider not in ordered:
                ordered.append(cast(AiProviderName, provider))
        return ordered

    def available_providers(self) -> list[AiProviderName]:
        flags = self.configured_provider_flags()
        return [provider for provider in self.provider_order() if flags.get(provider, False)]

    def configured_provider_flags(self) -> dict[str, bool]:
        return {
            "gemini": bool(self.gemini_api_key),
            "openai": bool(self.openai_api_key),
            "anthropic": bool(self.anthropic_api_key),
        }

    async def _call_provider(
        self,
        provider: AiProviderName,
        messages: list[AiMessage],
        *,
        temperature: float,
        max_tokens: int,
        metadata: dict[str, Any],
    ) -> AiProviderResult:
        if provider == "gemini":
            return await self._call_gemini(messages, temperature=temperature, max_tokens=max_tokens, metadata=metadata)
        if provider == "openai":
            return await self._call_openai(messages, temperature=temperature, max_tokens=max_tokens, metadata=metadata)
        return await self._call_anthropic(messages, temperature=temperature, max_tokens=max_tokens, metadata=metadata)

    async def _call_gemini(self, messages: list[AiMessage], *, temperature: float, max_tokens: int, metadata: dict[str, Any]) -> AiProviderResult:
        if not self.gemini_api_key:
            return self._missing("gemini")
        started = time.perf_counter()
        prompt = self._messages_to_prompt(messages)
        url = "https://generativelanguage.googleapis.com/v1beta/models/" f"{self.gemini_model}:generateContent"
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    url,
                    params={"key": self.gemini_api_key},
                    headers={"content-type": "application/json"},
                    json={
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
                    },
                )
            response.raise_for_status()
            payload = response.json()
            candidates = payload.get("candidates") or []
            first = candidates[0] if candidates else {}
            parts = ((first.get("content") if isinstance(first, dict) else {}) or {}).get("parts") or []
            content = "\n".join(str(part.get("text", "")) for part in parts if isinstance(part, dict)).strip()
            usage = payload.get("usageMetadata") or {}
            return AiProviderResult(True, "gemini", content, self.gemini_model, self._elapsed_ms(started), usage.get("totalTokenCount"), raw={"finish_reason": first.get("finishReason") if isinstance(first, dict) else None})
        except Exception as exc:
            return self._failed("gemini", exc, started)

    async def _call_openai(self, messages: list[AiMessage], *, temperature: float, max_tokens: int, metadata: dict[str, Any]) -> AiProviderResult:
        if not self.openai_api_key:
            return self._missing("openai")
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"authorization": f"Bearer {self.openai_api_key}", "content-type": "application/json"},
                    json={
                        "model": self.openai_model,
                        "messages": [{"role": message.role, "content": message.content} for message in messages],
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "metadata": {k: str(v)[:256] for k, v in (metadata or {}).items()} or None,
                    },
                )
            response.raise_for_status()
            payload = response.json()
            choices = payload.get("choices") or []
            first = choices[0] if choices else {}
            content = str(((first.get("message") if isinstance(first, dict) else {}) or {}).get("content") or "").strip()
            usage = payload.get("usage") or {}
            return AiProviderResult(True, "openai", content, self.openai_model, self._elapsed_ms(started), usage.get("total_tokens"), raw={"id": payload.get("id"), "finish_reason": first.get("finish_reason") if isinstance(first, dict) else None})
        except Exception as exc:
            return self._failed("openai", exc, started)

    async def _call_anthropic(self, messages: list[AiMessage], *, temperature: float, max_tokens: int, metadata: dict[str, Any]) -> AiProviderResult:
        if not self.anthropic_api_key:
            return self._missing("anthropic")
        started = time.perf_counter()
        system_prompt = "\n\n".join(message.content for message in messages if message.role == "system")
        conversation = [{"role": "assistant" if message.role == "assistant" else "user", "content": message.content} for message in messages if message.role != "system"]
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": self.anthropic_api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                    json={"model": self.anthropic_model, "max_tokens": max_tokens, "temperature": temperature, "system": system_prompt or None, "messages": conversation},
                )
            response.raise_for_status()
            payload = response.json()
            blocks = payload.get("content") or []
            content = "\n".join(str(block.get("text", "")) for block in blocks if isinstance(block, dict) and block.get("type") == "text").strip()
            usage = payload.get("usage") or {}
            tokens = int(usage.get("input_tokens", 0) or 0) + int(usage.get("output_tokens", 0) or 0)
            return AiProviderResult(True, "anthropic", content, self.anthropic_model, self._elapsed_ms(started), tokens or None, raw={"id": payload.get("id"), "stop_reason": payload.get("stop_reason")})
        except Exception as exc:
            return self._failed("anthropic", exc, started)

    def _normalize_messages(self, messages: list[dict[str, str]] | list[AiMessage]) -> list[AiMessage]:
        normalized: list[AiMessage] = []
        for item in messages:
            if isinstance(item, AiMessage):
                normalized.append(item)
                continue
            role = str(item.get("role", "user")).strip().lower()
            content = str(item.get("content", "")).strip()
            if role not in {"system", "user", "assistant"}:
                role = "user"
            if content:
                normalized.append(AiMessage(role=role, content=content))  # type: ignore[arg-type]
        return normalized or [AiMessage(role="user", content="Continue.")]

    def _messages_to_prompt(self, messages: list[AiMessage]) -> str:
        return "\n\n".join(f"{message.role.upper()}:\n{message.content}" for message in messages)

    def _missing(self, provider: AiProviderName) -> AiProviderResult:
        return AiProviderResult(False, provider, "", error=f"{provider} API key is not configured.")

    def _failed(self, provider: AiProviderName, exc: Exception, started: float) -> AiProviderResult:
        return AiProviderResult(False, provider, "", latency_ms=self._elapsed_ms(started), error=f"{exc.__class__.__name__}: {str(exc)[:180]}")

    def _elapsed_ms(self, started: float) -> float:
        return round((time.perf_counter() - started) * 1000, 2)

    def _env(self, key: str, default: str = "") -> str:
        return str(os.getenv(key, default) or "").strip()


ai_provider_service = AiProviderService()
AIProviderService = AiProviderService
