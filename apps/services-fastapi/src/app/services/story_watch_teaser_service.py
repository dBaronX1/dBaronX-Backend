from __future__ import annotations

import re
from typing import Any


class StoryWatchTeaserService:
    """
    Watch-to-earn teaser builder for AI Stories.

    Output is optimized for:
    - short teaser overlays
    - mobile video/story ad scripts
    - watch campaign headline/body pairs
    - anti-bloat delivery
    """

    def build(
        self,
        *,
        title: str,
        excerpt: str,
        genre: str | None = None,
        tone: str | None = None,
        teaser_seconds: int = 15,
    ) -> dict[str, Any]:
        safe_title = self._require(title, "title")
        safe_excerpt = self._require(excerpt, "excerpt")
        safe_seconds = max(5, min(30, int(teaser_seconds)))

        overlay_lines = self._overlay_lines(
            title=safe_title,
            excerpt=safe_excerpt,
            genre=genre,
            tone=tone,
            teaser_seconds=safe_seconds,
        )
        script = self._script(
            title=safe_title,
            excerpt=safe_excerpt,
            genre=genre,
            tone=tone,
            teaser_seconds=safe_seconds,
        )

        return {
            "success": True,
            "watch_teaser": {
                "teaser_seconds": safe_seconds,
                "overlay_lines": overlay_lines,
                "script": script,
                "cta": "Open story",
            },
        }

    def _overlay_lines(
        self,
        *,
        title: str,
        excerpt: str,
        genre: str | None,
        tone: str | None,
        teaser_seconds: int,
    ) -> list[str]:
        compact = self._compact(excerpt, 96)
        lines = [
            self._truncate(title, 52),
            self._truncate(compact, 72),
        ]
        if genre:
            lines.append(self._truncate(f"{genre.capitalize()} story", 32))
        elif tone:
            lines.append(self._truncate(f"{tone.capitalize()} tone", 32))
        else:
            lines.append(f"{teaser_seconds}s teaser")
        return lines[:3]

    def _script(
        self,
        *,
        title: str,
        excerpt: str,
        genre: str | None,
        tone: str | None,
        teaser_seconds: int,
    ) -> str:
        compact = self._compact(excerpt, 170)
        parts = [f"In {teaser_seconds} seconds, enter {title}."]
        if genre:
            parts.append(f"It starts as a {genre} story")
        if tone:
            parts.append(f"with a {tone} edge")
        parts.append(compact)
        parts.append("Open the story to see what happens next.")
        return " ".join(parts)

    def _compact(self, text: str, limit: int) -> str:
        normalized = re.sub(r"\s+", " ", text).strip()
        if len(normalized) <= limit:
            return normalized
        shortened = normalized[:limit].rsplit(" ", 1)[0].strip()
        return f"{shortened}..."

    def _truncate(self, text: str, limit: int) -> str:
        if len(text) <= limit:
            return text
        shortened = text[:limit].rsplit(" ", 1)[0].strip()
        return f"{shortened}..."

    def _require(self, value: str, field_name: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
