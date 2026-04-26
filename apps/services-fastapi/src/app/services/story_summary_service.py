from __future__ import annotations

import re
import time
from typing import Any

from app.services.anthropic_provider import AnthropicProvider
from app.services.gemini_provider import GeminiProvider
from app.services.openai_provider import OpenAIProvider


class StorySummaryService:
    """
    Canonical summary engine for AI Stories.

    Output is optimized for:
    - mobile reading cards
    - discovery/search snippets
    - affiliate/share previews
    - moderation and ops review queues
    """

    def __init__(
        self,
        *,
        openai_provider: OpenAIProvider | None = None,
        anthropic_provider: AnthropicProvider | None = None,
        gemini_provider: GeminiProvider | None = None,
    ) -> None:
        self.openai_provider = openai_provider or OpenAIProvider()
        self.anthropic_provider = anthropic_provider or AnthropicProvider()
        self.gemini_provider = gemini_provider or GeminiProvider()

    async def summarize(
        self,
        *,
        content: str,
        max_words: int = 60,
        style: str = "concise",
        language: str | None = None,
        use_ai: bool = True,
    ) -> dict[str, Any]:
        started_at = time.perf_counter()

        normalized = self._normalize_content(content)
        safe_max_words = max(20, min(max_words, 160))
        safe_style = (style or "concise").strip().lower()

        if not use_ai or len(normalized) < 600:
            summary = self._extractive_summary(
                content=normalized,
                max_words=safe_max_words,
            )
            return {
                "success": True,
                "provider": "deterministic",
                "latency_ms": int((time.perf_counter() - started_at) * 1000),
                "summary": summary,
                "max_words": safe_max_words,
                "style": safe_style,
            }

        prompt = self._build_prompt(
            content=normalized,
            max_words=safe_max_words,
            style=safe_style,
            language=language,
        )

        providers = [
            ("anthropic", self.anthropic_provider),
            ("openai", self.openai_provider),
            ("gemini", self.gemini_provider),
        ]

        last_error: Exception | None = None
        for provider_name, provider in providers:
            try:
                result = await provider.generate_text(
                    prompt=prompt,
                    max_output_tokens=900,
                    temperature=0.3,
                )
                return {
                    "success": True,
                    "provider": provider_name,
                    "latency_ms": int((time.perf_counter() - started_at) * 1000),
                    "summary": self._clean_generated_summary(result),
                    "max_words": safe_max_words,
                    "style": safe_style,
                }
            except Exception as exc:  # noqa: BLE001
                last_error = exc

        fallback = self._extractive_summary(
            content=normalized,
            max_words=safe_max_words,
        )
        return {
            "success": True,
            "provider": "deterministic_fallback",
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
            "summary": fallback,
            "max_words": safe_max_words,
            "style": safe_style,
            "fallback_reason": str(last_error) if last_error else None,
        }

    def _normalize_content(self, content: str) -> str:
        normalized = " ".join(content.strip().split())
        if not normalized:
            raise ValueError("content is required")
        return normalized

    def _build_prompt(
        self,
        *,
        content: str,
        max_words: int,
        style: str,
        language: str | None,
    ) -> str:
        rules = [
            f"Summarize the story in {max_words} words or fewer.",
            f"Style: {style}.",
            "Preserve core plot, stakes, tone, and protagonist direction.",
            "Do not add information not present in the story.",
            "Return only the summary text.",
        ]
        if language:
            rules.append(f"Write in language: {language}.")

        return (
            "You are dBaronX AI Stories summarization engine.\n"
            + "\n".join(f"- {rule}" for rule in rules)
            + f"\n\nStory content:\n{content}"
        )

    def _extractive_summary(self, *, content: str, max_words: int) -> str:
        sentences = re.split(r"(?<=[.!?])\s+", content)
        if not sentences:
            return " ".join(content.split()[:max_words])

        ranked = sorted(
            sentences,
            key=lambda sentence: self._sentence_score(sentence),
            reverse=True,
        )

        selected: list[str] = []
        current_words = 0

        for sentence in ranked:
            words = sentence.split()
            if not words:
                continue

            if current_words + len(words) > max_words and selected:
                continue

            selected.append(sentence.strip())
            current_words += len(words)

            if current_words >= max_words:
                break

        if not selected:
            selected = [" ".join(content.split()[:max_words]).strip()]

        ordered = [s for s in sentences if s.strip() in set(selected)]
        summary = " ".join(ordered).strip()

        if not summary.endswith((".", "!", "?")):
            summary += "."

        return summary

    def _sentence_score(self, sentence: str) -> float:
        text = sentence.strip()
        if not text:
            return 0.0

        words = text.split()
        word_count = len(words)

        score = 0.0
        if 8 <= word_count <= 30:
            score += 3.0
        elif word_count < 8:
            score += 0.5
        else:
            score += 1.5

        emphasis_markers = ["but", "because", "suddenly", "however", "then", "after"]
        score += sum(0.35 for token in emphasis_markers if token in text.lower())
        score += min(text.count(","), 3) * 0.1
        return score

    def _clean_generated_summary(self, text: str) -> str:
        cleaned = " ".join(text.strip().split())
        cleaned = cleaned.strip("\"' ")
        return cleaned
