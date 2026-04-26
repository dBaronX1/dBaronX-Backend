from __future__ import annotations

import math
import re
from collections import Counter


class StoryMetadataService:
    """
    Canonical low-cost metadata extractor.

    Used after generation to avoid extra provider calls when not necessary:
    - excerpt
    - tags
    - reading time
    - word count
    - paragraph count
    """

    _token_pattern = re.compile(r"[A-Za-z0-9']+")
    _sentence_split = re.compile(r"(?<=[.!?])\s+")
    _stop_words = {
        "the", "and", "for", "with", "that", "this", "from", "into", "your",
        "have", "will", "they", "them", "their", "there", "about", "after",
        "before", "while", "where", "when", "what", "which", "because", "through",
        "would", "could", "should", "story", "said", "then", "than", "over",
        "under", "been", "being", "were", "was", "are", "is", "you", "his", "her",
        "our", "out", "not", "but", "can", "all", "any", "who", "had", "has",
    }

    def excerpt(self, content: str, max_chars: int = 220) -> str:
        text = (content or "").strip()
        if not text:
            return ""

        first_sentence = self._sentence_split.split(text, maxsplit=1)[0].strip()
        if first_sentence and len(first_sentence) <= max_chars:
            return first_sentence

        if len(text) <= max_chars:
            return text

        return text[: max_chars - 1].rstrip() + "…"

    def reading_time(self, content: str, words_per_minute: int = 220) -> dict[str, int]:
        word_count = self.word_count(content)
        minutes = max(1, math.ceil(word_count / max(1, words_per_minute)))
        return {
            "words": word_count,
            "minutes": minutes,
        }

    def word_count(self, content: str) -> int:
        return len(self._token_pattern.findall(content or ""))

    def paragraph_count(self, content: str) -> int:
        parts = [p.strip() for p in (content or "").split("\n\n") if p.strip()]
        return len(parts)

    def tags(self, content: str, max_tags: int = 8) -> list[str]:
        tokens = [
            token.lower()
            for token in self._token_pattern.findall(content or "")
            if len(token) > 3 and token.lower() not in self._stop_words
        ]
        if not tokens:
            return []

        ranked = Counter(tokens).most_common(max_tags * 2)

        output: list[str] = []
        for token, _freq in ranked:
            if token not in output:
                output.append(token)
            if len(output) >= max_tags:
                break

        return output

    def summarize_structure(self, content: str) -> dict[str, int]:
        return {
            "word_count": self.word_count(content),
            "paragraph_count": self.paragraph_count(content),
            "sentence_count": len(self._sentence_split.split((content or "").strip()))
            if (content or "").strip()
            else 0,
        }
