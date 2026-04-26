from __future__ import annotations

import re
from typing import Any

from app.services.story_metadata_service import StoryMetadataService


class StoryExcerptService:
    """
    Canonical excerpt generator for AI Stories.

    Design goals:
    - deterministic and low-bandwidth by default
    - safe for discovery cards, promotion teasers, affiliate snippets, and W2E cards
    - optimized for mobile-first payload size and readability
    """

    def __init__(
        self,
        *,
        metadata_service: StoryMetadataService | None = None,
    ) -> None:
        self.metadata_service = metadata_service or StoryMetadataService()

    def generate_excerpt(
        self,
        *,
        content: str,
        title_hint: str | None = None,
        max_words: int = 45,
        genre: str | None = None,
        tone: str | None = None,
        language: str | None = None,
    ) -> dict[str, Any]:
        normalized = self._normalize_content(content)
        metadata = self.metadata_service.build_from_story(
            content=normalized,
            prompt="",
            genre=genre or "fiction",
            tone=tone or "engaging",
            language=language or "en",
            title_hint=title_hint,
        )

        excerpt = self._build_excerpt(
            content=normalized,
            max_words=max_words,
        )

        teaser = self._build_teaser(
            excerpt=excerpt,
            title=metadata["title"],
            genre=metadata["genre"],
            tone=metadata["tone"],
        )

        return {
            "success": True,
            "excerpt": excerpt,
            "teaser": teaser,
            "word_count": len(excerpt.split()),
            "character_count": len(excerpt),
            "title": metadata["title"],
        }

    def _normalize_content(self, content: str) -> str:
        cleaned = " ".join(content.strip().split())
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    def _build_excerpt(self, *, content: str, max_words: int) -> str:
        safe_limit = max(20, min(max_words, 80))
        sentences = re.split(r"(?<=[.!?])\s+", content)
        if not sentences:
            return content[:320].strip()

        output_words: list[str] = []
        for sentence in sentences:
            words = sentence.split()
            if not words:
                continue

            if len(output_words) + len(words) > safe_limit and output_words:
                break

            output_words.extend(words)

            if len(output_words) >= safe_limit:
                break

        excerpt = " ".join(output_words).strip()
        if not excerpt:
            excerpt = " ".join(content.split()[:safe_limit]).strip()

        if excerpt and not excerpt.endswith((".", "!", "?")):
            excerpt = f"{excerpt}…"

        return excerpt

    def _build_teaser(
        self,
        *,
        excerpt: str,
        title: str,
        genre: str,
        tone: str,
    ) -> str:
        prefix = title.strip() if title else genre.replace("_", " ").title()
        short_excerpt = excerpt
        if len(short_excerpt) > 180:
            short_excerpt = short_excerpt[:177].rstrip() + "..."

        return f"{prefix} — {tone.replace('_', ' ')} {genre.replace('_', ' ')} story. {short_excerpt}"
