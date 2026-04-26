from __future__ import annotations

from collections import Counter
from typing import Any


class RecommendationSignalService:
    """
    Deterministic recommendation signal generator.

    Purpose:
    - powers low-cost discovery ranking signals
    - feeds NestJS with promotion suitability hints
    - supports affiliate / watch-to-earn / featured placement compatibility
    - avoids expensive model calls for first-pass scoring
    """

    _GENRE_WEIGHTS: dict[str, float] = {
        "fiction": 0.70,
        "fantasy": 0.82,
        "romance": 0.78,
        "adventure": 0.80,
        "thriller": 0.79,
        "mystery": 0.76,
        "sci-fi": 0.81,
        "horror": 0.68,
        "drama": 0.66,
        "inspirational": 0.73,
    }

    _TONE_WEIGHTS: dict[str, float] = {
        "engaging": 0.80,
        "warm": 0.74,
        "epic": 0.83,
        "heroic": 0.82,
        "emotional": 0.77,
        "mysterious": 0.79,
        "suspenseful": 0.80,
        "dark": 0.60,
        "playful": 0.69,
        "educational": 0.58,
    }

    def from_story(
        self,
        *,
        title: str,
        excerpt: str,
        content: str,
        genre: str,
        tone: str,
        language: str,
        tags: list[str],
    ) -> dict[str, Any]:
        normalized_genre = genre.strip().lower()
        normalized_tone = tone.strip().lower()
        normalized_language = language.strip().lower()

        word_count = len(content.split())
        title_strength = self._title_strength(title)
        excerpt_strength = self._excerpt_strength(excerpt)
        freshness_score = self._freshness_score(content)
        keyword_density = self._keyword_density(content, tags)
        readability = self._readability_proxy(content)
        repeat_penalty = self._repeat_penalty(content)

        discovery_score = self._bounded(
            (
                title_strength * 0.18
                + excerpt_strength * 0.15
                + self._GENRE_WEIGHTS.get(normalized_genre, 0.64) * 0.16
                + self._TONE_WEIGHTS.get(normalized_tone, 0.66) * 0.14
                + freshness_score * 0.10
                + keyword_density * 0.09
                + readability * 0.11
                + (1.0 - repeat_penalty) * 0.07
            )
        )

        promo_ready = discovery_score >= 0.62 and word_count >= 180
        affiliate_ready = promo_ready and repeat_penalty <= 0.22
        watch_to_earn_ready = promo_ready and excerpt_strength >= 0.55

        audience_buckets = self._audience_buckets(
            genre=normalized_genre,
            tone=normalized_tone,
            language=normalized_language,
            tags=tags,
        )

        return {
            "discovery_score": round(discovery_score, 4),
            "title_strength": round(title_strength, 4),
            "excerpt_strength": round(excerpt_strength, 4),
            "freshness_score": round(freshness_score, 4),
            "keyword_density_score": round(keyword_density, 4),
            "readability_proxy": round(readability, 4),
            "repeat_penalty": round(repeat_penalty, 4),
            "promo_ready": promo_ready,
            "affiliate_ready": affiliate_ready,
            "watch_to_earn_ready": watch_to_earn_ready,
            "mobile_reading_ready": word_count >= 150 and readability >= 0.52,
            "audience_buckets": audience_buckets,
            "placement_hints": self._placement_hints(
                promo_ready=promo_ready,
                affiliate_ready=affiliate_ready,
                watch_to_earn_ready=watch_to_earn_ready,
                genre=normalized_genre,
                tone=normalized_tone,
            ),
        }

    def _title_strength(self, title: str) -> float:
        cleaned = title.strip()
        if not cleaned:
            return 0.0

        words = cleaned.split()
        score = 0.45
        if 3 <= len(words) <= 9:
            score += 0.25
        if any(ch.isalpha() for ch in cleaned):
            score += 0.10
        if any(token[0].isupper() for token in words if token):
            score += 0.08
        if ":" in cleaned or "-" in cleaned:
            score += 0.05

        return self._bounded(score)

    def _excerpt_strength(self, excerpt: str) -> float:
        cleaned = excerpt.strip()
        if len(cleaned) < 40:
            return 0.12

        score = 0.40
        if len(cleaned) >= 90:
            score += 0.18
        if any(mark in cleaned for mark in ["?", "!", "—", ":"]):
            score += 0.08
        if any(word in cleaned.lower() for word in ["but", "until", "when", "after", "before"]):
            score += 0.10
        if cleaned.count(",") >= 1:
            score += 0.05

        return self._bounded(score)

    def _freshness_score(self, content: str) -> float:
        normalized = content.lower()
        novelty_words = [
            "unexpected",
            "beneath",
            "fractured",
            "luminous",
            "forgotten",
            "ancient",
            "signal",
            "pulse",
            "threshold",
            "mirror",
        ]
        hits = sum(normalized.count(word) for word in novelty_words)
        return self._bounded(0.35 + min(0.45, hits * 0.03))

    def _keyword_density(self, content: str, tags: list[str]) -> float:
        if not content.strip() or not tags:
            return 0.25

        normalized = content.lower()
        hits = 0
        for tag in tags[:8]:
            token = tag.lower().strip()
            if token:
                hits += normalized.count(token)

        total_words = max(1, len(normalized.split()))
        density = hits / total_words
        return self._bounded(0.25 + min(0.55, density * 18))

    def _readability_proxy(self, content: str) -> float:
        words = content.split()
        if not words:
            return 0.0

        avg_word_length = sum(len(word) for word in words) / len(words)
        sentence_count = max(1, content.count(".") + content.count("!") + content.count("?"))
        avg_sentence_length = len(words) / sentence_count

        score = 0.95
        score -= max(0.0, avg_word_length - 6.2) * 0.08
        score -= max(0.0, avg_sentence_length - 24) * 0.02
        return self._bounded(score)

    def _repeat_penalty(self, content: str) -> float:
        tokens = [token.lower() for token in content.split() if len(token) > 2]
        if not tokens:
            return 0.0

        counts = Counter(tokens)
        repeated = sum(count - 1 for count in counts.values() if count > 1)
        penalty = repeated / max(1, len(tokens))
        return self._bounded(penalty)

    def _audience_buckets(
        self,
        *,
        genre: str,
        tone: str,
        language: str,
        tags: list[str],
    ) -> list[str]:
        buckets: list[str] = []

        if genre in {"fantasy", "sci-fi", "adventure"}:
            buckets.append("immersive_readers")
        if genre in {"romance", "drama"} or tone in {"warm", "emotional"}:
            buckets.append("emotion_driven_readers")
        if genre in {"thriller", "mystery", "horror"} or tone in {"suspenseful", "mysterious"}:
            buckets.append("high_tension_readers")
        if "short-read" in {tag.lower() for tag in tags}:
            buckets.append("mobile_quick_reads")
        if language == "en":
            buckets.append("global_english_audience")

        return buckets or ["general_story_audience"]

    def _placement_hints(
        self,
        *,
        promo_ready: bool,
        affiliate_ready: bool,
        watch_to_earn_ready: bool,
        genre: str,
        tone: str,
    ) -> list[str]:
        hints: list[str] = []

        if promo_ready:
            hints.append("featured_discovery")
        if affiliate_ready:
            hints.append("creator_affiliate_push")
        if watch_to_earn_ready:
            hints.append("watch_to_earn_teaser")

        if genre in {"fantasy", "sci-fi", "adventure"}:
            hints.append("genre_highlight_rail")
        if tone in {"mysterious", "suspenseful", "dark"}:
            hints.append("teaser_card_format")

        return hints

    def _bounded(self, value: float) -> float:
        return max(0.0, min(1.0, value))
