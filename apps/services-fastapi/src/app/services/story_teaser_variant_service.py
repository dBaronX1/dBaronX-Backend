from __future__ import annotations

import re
from typing import Any


class StoryTeaserVariantService:
    """
    Generates teaser variants for:
    - discovery cards
    - affiliate cards
    - watch-to-earn creatives
    - push/email/social placements

    Output is compact, mobile-first, and bandwidth-conscious.
    """

    MAX_VARIANTS = 5

    def build(
        self,
        *,
        title: str,
        excerpt: str,
        genre: str | None = None,
        tone: str | None = None,
        audience: str | None = None,
        cta_target: str = "read_now",
        max_variants: int = 4,
    ) -> dict[str, Any]:
        safe_title = self._require(title, "title")
        safe_excerpt = self._require(excerpt, "excerpt")
        limit = max(1, min(self.MAX_VARIANTS, int(max_variants)))

        genre_label = self._normalize_label(genre)
        tone_label = self._normalize_label(tone)
        audience_label = self._normalize_label(audience)

        opening_fragment = self._opening_fragment(safe_excerpt)
        tension_fragment = self._tension_fragment(safe_excerpt)
        emotional_fragment = self._emotional_fragment(safe_excerpt)

        pool = [
            {
                "kind": "hook_primary",
                "headline": safe_title,
                "body": opening_fragment,
                "cta": self._cta(cta_target, "primary"),
            },
            {
                "kind": "tension",
                "headline": self._tension_headline(safe_title, genre_label),
                "body": tension_fragment,
                "cta": self._cta(cta_target, "urgent"),
            },
            {
                "kind": "emotion",
                "headline": self._emotion_headline(safe_title, tone_label),
                "body": emotional_fragment,
                "cta": self._cta(cta_target, "soft"),
            },
            {
                "kind": "genre_positioning",
                "headline": self._genre_headline(safe_title, genre_label, audience_label),
                "body": self._compact(excerpt=safe_excerpt, limit=148),
                "cta": self._cta(cta_target, "genre"),
            },
            {
                "kind": "curiosity",
                "headline": self._curiosity_headline(safe_title),
                "body": self._curiosity_body(safe_excerpt),
                "cta": self._cta(cta_target, "curiosity"),
            },
        ]

        variants = pool[:limit]
        return {
            "success": True,
            "variants": variants,
        }

    def _opening_fragment(self, excerpt: str) -> str:
        return self._compact(excerpt=excerpt, limit=150)

    def _tension_fragment(self, excerpt: str) -> str:
        cleaned = self._compact(excerpt=excerpt, limit=132)
        if "?" not in cleaned:
            return f"{cleaned} What happens next?"
        return cleaned

    def _emotional_fragment(self, excerpt: str) -> str:
        text = self._compact(excerpt=excerpt, limit=136)
        if not re.search(r"\b(love|fear|loss|hope|betrayal|choice|regret)\b", text.lower()):
            return f"{text} Feel the pressure behind every decision."
        return text

    def _curiosity_body(self, excerpt: str) -> str:
        text = self._compact(excerpt=excerpt, limit=126)
        return f"{text} Start the story and uncover the truth."

    def _tension_headline(self, title: str, genre: str | None) -> str:
        if genre:
            return f"{title} — A {genre} turn you won't expect"
        return f"{title} — One decision changes everything"

    def _emotion_headline(self, title: str, tone: str | None) -> str:
        if tone:
            return f"{title} — {tone.capitalize()} and impossible to ignore"
        return f"{title} — The emotion hits immediately"

    def _genre_headline(
        self,
        title: str,
        genre: str | None,
        audience: str | None,
    ) -> str:
        if genre and audience:
            return f"{genre.capitalize()} for {audience}: {title}"
        if genre:
            return f"{genre.capitalize()} spotlight: {title}"
        return title

    def _curiosity_headline(self, title: str) -> str:
        return f"{title} — Read before someone else spoils it"

    def _cta(self, target: str, style: str) -> str:
        normalized = str(target or "read_now").strip().lower()
        if normalized == "discover":
            mapping = {
                "primary": "Discover story",
                "urgent": "Open story",
                "soft": "Read more",
                "genre": "Explore now",
                "curiosity": "See why",
            }
            return mapping.get(style, "Discover")
        mapping = {
            "primary": "Read now",
            "urgent": "Start reading",
            "soft": "Continue here",
            "genre": "Open story",
            "curiosity": "Find out",
        }
        return mapping.get(style, "Read now")

    def _compact(self, *, excerpt: str, limit: int) -> str:
        text = re.sub(r"\s+", " ", excerpt).strip()
        if len(text) <= limit:
            return text
        shortened = text[:limit].rsplit(" ", 1)[0].strip()
        return f"{shortened}..."

    def _normalize_label(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = re.sub(r"\s+", " ", value).strip().lower()
        return cleaned or None

    def _require(self, value: str, field_name: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
