from __future__ import annotations

from typing import Any


class PromotionCopyService:
    """
    Generates platform-safe promotional copy primitives for:
    - affiliate promos
    - watch-to-earn creatives
    - story landing cards
    - discovery surfaces
    """

    def build_story_teaser(
        self,
        *,
        title: str,
        excerpt: str,
        genre: str,
        tone: str,
    ) -> dict[str, Any]:
        short_excerpt = excerpt[:160].strip()
        if len(excerpt) > 160:
            short_excerpt += "..."

        headline = self._headline(title=title, genre=genre)
        cta = self._cta(tone=tone)

        return {
            "headline": headline,
            "body": short_excerpt,
            "cta": cta,
            "affiliate_copy": f"{headline} — {cta}",
            "watch_to_earn_copy": f"Watch and discover: {title}",
        }

    def _headline(self, *, title: str, genre: str) -> str:
        genre_label = genre.strip().title() if genre.strip() else "Story"
        return f"{genre_label}: {title.strip()}"

    def _cta(self, *, tone: str) -> str:
        normalized = tone.lower().strip()

        if normalized in {"dark", "mysterious", "suspenseful"}:
            return "Read now if you dare"
        if normalized in {"romantic", "warm", "emotional"}:
            return "Read the full story"
        if normalized in {"epic", "adventurous", "heroic"}:
            return "Start the journey"
        return "Read now"
