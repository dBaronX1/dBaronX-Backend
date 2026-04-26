from __future__ import annotations

import re
from collections import Counter
from typing import Any

from app.services.story_classification_service import StoryClassificationService


class StoryTagGenerationService:
    """
    Deterministic tag generator.

    Canonical goals:
    - no-provider fallback
    - fast mobile-safe enrichment
    - feed/discovery consistency
    - reusable metadata for NestJS storage and promotion systems
    """

    STOPWORDS = {
        "the",
        "and",
        "that",
        "with",
        "from",
        "this",
        "there",
        "their",
        "have",
        "into",
        "were",
        "about",
        "after",
        "before",
        "through",
        "while",
        "where",
        "which",
        "because",
        "would",
        "could",
        "should",
        "them",
        "they",
        "your",
        "ours",
        "hers",
        "his",
        "then",
        "than",
        "when",
        "what",
        "been",
        "being",
        "over",
        "under",
        "more",
        "most",
        "some",
        "many",
        "very",
    }

    def __init__(
        self,
        *,
        classification_service: StoryClassificationService | None = None,
    ) -> None:
        self.classification_service = classification_service or StoryClassificationService()

    def generate_tags(
        self,
        *,
        content: str,
        prompt: str | None = None,
        title: str | None = None,
        max_tags: int = 12,
    ) -> dict[str, Any]:
        cleaned_content = content.strip()
        if not cleaned_content:
            raise ValueError("content is required")

        safe_max_tags = max(4, min(max_tags, 20))
        classification = self.classification_service.classify(
            content=cleaned_content,
            prompt=prompt,
            title=title,
        )

        text = " ".join([title or "", prompt or "", cleaned_content]).lower()
        words = re.findall(r"[a-zA-Z][a-zA-Z\-']{2,}", text)
        filtered = [word for word in words if word not in self.STOPWORDS]
        counts = Counter(filtered)

        tags: list[str] = []
        seeded = [
            classification["genre"],
            classification["tone"],
            classification["audience"],
        ]
        for item in seeded:
            normalized = self._normalize_tag(item)
            if normalized and normalized not in tags:
                tags.append(normalized)

        for word, _count in counts.most_common(50):
            candidate = self._normalize_tag(word)
            if not candidate:
                continue
            if candidate in tags:
                continue
            tags.append(candidate)
            if len(tags) >= safe_max_tags:
                break

        return {
            "tags": tags[:safe_max_tags],
            "classification": classification,
        }

    def _normalize_tag(self, value: str | None) -> str | None:
        if not value:
            return None
        normalized = value.strip().lower().replace("_", "-").replace(" ", "-")
        normalized = re.sub(r"[^a-z0-9\-]+", "", normalized)
        normalized = re.sub(r"\-+", "-", normalized).strip("-")
        if len(normalized) < 3:
            return None
        return normalized
