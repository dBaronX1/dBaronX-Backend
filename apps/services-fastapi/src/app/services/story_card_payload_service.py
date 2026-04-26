from __future__ import annotations

import re
from typing import Any

from app.services.story_read_time_service import StoryReadTimeService
from app.services.story_teaser_variant_service import StoryTeaserVariantService


class StoryCardPayloadService:
    """
    Canonical compact story-card payload builder.

    Purpose:
    - low-bandwidth mobile story cards
    - discovery feed entries
    - affiliate card previews
    - watch-to-earn teaser card payloads
    - AI Stories public listing surfaces
    """

    def __init__(
        self,
        *,
        read_time_service: StoryReadTimeService | None = None,
        teaser_variant_service: StoryTeaserVariantService | None = None,
    ) -> None:
        self.read_time_service = read_time_service or StoryReadTimeService()
        self.teaser_variant_service = (
            teaser_variant_service or StoryTeaserVariantService()
        )

    def build(
        self,
        *,
        story_id: str,
        title: str,
        content: str,
        excerpt: str | None = None,
        genre: str | None = None,
        tone: str | None = None,
        audience: str | None = None,
        cover_image_url: str | None = None,
        creator_id: str | None = None,
        creator_name: str | None = None,
        tags: list[str] | None = None,
        published_at: str | None = None,
        slug: str | None = None,
        visibility: str = "public",
        status: str = "published",
        promotion_state: str | None = None,
        affiliate_eligible: bool = False,
        ad_eligible: bool = False,
    ) -> dict[str, Any]:
        safe_story_id = self._require(story_id, "story_id")
        safe_title = self._require(title, "title")
        safe_content = self._require(content, "content")

        effective_excerpt = self._effective_excerpt(
            excerpt=excerpt,
            content=safe_content,
        )
        read_time = self.read_time_service.estimate(content=safe_content)
        teaser_variants = self.teaser_variant_service.build(
            title=safe_title,
            excerpt=effective_excerpt,
            genre=genre,
            tone=tone,
            audience=audience,
            cta_target="discover",
            max_variants=3,
        )

        card = {
            "story_id": safe_story_id,
            "slug": self._slug(slug or safe_title),
            "title": safe_title,
            "excerpt": effective_excerpt,
            "meta": {
                "genre": self._normalize_optional(genre),
                "tone": self._normalize_optional(tone),
                "audience": self._normalize_optional(audience),
                "tags": self._normalized_tags(tags),
                "visibility": visibility,
                "status": status,
                "promotion_state": promotion_state,
            },
            "creator": {
                "id": self._normalize_optional(creator_id),
                "name": self._normalize_optional(creator_name),
            },
            "media": {
                "cover_image_url": self._normalize_optional(cover_image_url),
            },
            "reading": {
                "minutes_rounded": read_time["reading_time"]["minutes_rounded"],
                "word_count": read_time["metrics"]["word_count"],
            },
            "eligibility": {
                "affiliate_eligible": affiliate_eligible,
                "ad_eligible": ad_eligible,
            },
            "publication": {
                "published_at": self._normalize_optional(published_at),
            },
            "teasers": teaser_variants["variants"],
        }

        return {
            "success": True,
            "card": card,
        }

    def _effective_excerpt(self, *, excerpt: str | None, content: str) -> str:
        if excerpt and excerpt.strip():
            return self._compact(excerpt.strip(), 220)

        normalized = re.sub(r"\s+", " ", content).strip()
        if len(normalized) <= 220:
            return normalized

        shortened = normalized[:220].rsplit(" ", 1)[0].strip()
        return f"{shortened}..."

    def _normalized_tags(self, tags: list[str] | None) -> list[str]:
        if not tags:
            return []
        normalized: list[str] = []
        for tag in tags:
            cleaned = re.sub(r"\s+", " ", str(tag)).strip()
            if cleaned:
                normalized.append(cleaned[:40])
        return normalized[:8]

    def _slug(self, value: str) -> str:
        normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
        return normalized[:120] or "story"

    def _compact(self, value: str, limit: int) -> str:
        normalized = re.sub(r"\s+", " ", value).strip()
        if len(normalized) <= limit:
            return normalized
        shortened = normalized[:limit].rsplit(" ", 1)[0].strip()
        return f"{shortened}..."

    def _normalize_optional(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = re.sub(r"\s+", " ", value).strip()
        return cleaned or None

    def _require(self, value: str, field_name: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
