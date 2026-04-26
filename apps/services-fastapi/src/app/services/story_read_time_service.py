from __future__ import annotations

import math
import re
from typing import Any


class StoryReadTimeService:
    """
    Canonical reading-time engine.

    Used by:
    - mobile story cards
    - creator dashboard
    - promotion quote logic
    - discovery ranking
    - publication readiness checks
    """

    DEFAULT_WPM = 220
    MIN_WPM = 120
    MAX_WPM = 350

    def estimate(
        self,
        *,
        content: str,
        language: str | None = None,
        words_per_minute: int | None = None,
    ) -> dict[str, Any]:
        normalized = self._normalize_required(content, "content")
        word_count = self._count_words(normalized)
        sentence_count = self._count_sentences(normalized)
        paragraph_count = self._count_paragraphs(normalized)
        char_count = len(normalized)
        safe_wpm = self._resolve_wpm(words_per_minute)

        minutes_exact = word_count / safe_wpm if word_count > 0 else 0.0
        minutes_rounded = max(1, math.ceil(minutes_exact)) if word_count > 0 else 0
        seconds_estimate = int(round(minutes_exact * 60))

        density = round(word_count / max(paragraph_count, 1), 2)
        sentence_length = round(word_count / max(sentence_count, 1), 2)

        return {
            "success": True,
            "reading_time": {
                "minutes_exact": round(minutes_exact, 2),
                "minutes_rounded": minutes_rounded,
                "seconds_estimate": seconds_estimate,
                "words_per_minute": safe_wpm,
            },
            "metrics": {
                "word_count": word_count,
                "sentence_count": sentence_count,
                "paragraph_count": paragraph_count,
                "char_count": char_count,
                "avg_words_per_sentence": sentence_length,
                "avg_words_per_paragraph": density,
                "language": language or "en",
            },
        }

    def _resolve_wpm(self, words_per_minute: int | None) -> int:
        if words_per_minute is None:
            return self.DEFAULT_WPM
        return max(self.MIN_WPM, min(self.MAX_WPM, int(words_per_minute)))

    def _normalize_required(self, value: str, field_name: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned

    def _count_words(self, content: str) -> int:
        return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'\-]*", content))

    def _count_sentences(self, content: str) -> int:
        parts = re.split(r"[.!?]+", content)
        return len([part for part in parts if part.strip()])

    def _count_paragraphs(self, content: str) -> int:
        parts = re.split(r"\n\s*\n", content)
        return len([part for part in parts if part.strip()])
