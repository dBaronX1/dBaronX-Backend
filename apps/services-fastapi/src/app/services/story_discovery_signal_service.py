from __future__ import annotations

import math
import re
from typing import Any

from app.services.story_classification_service import StoryClassificationService
from app.services.story_publication_readiness_service import (
    StoryPublicationReadinessService,
)
from app.services.story_read_time_service import StoryReadTimeService


class StoryDiscoverySignalService:
    """
    Canonical discovery-signal engine for AI Stories.

    Produces ranking-ready signals for:
    - home/discovery feeds
    - promoted story slot eligibility
    - watch-to-earn story campaign placement
    - affiliate/story recommendation blending
    """

    def __init__(
        self,
        *,
        classification_service: StoryClassificationService | None = None,
        publication_readiness_service: StoryPublicationReadinessService | None = None,
        read_time_service: StoryReadTimeService | None = None,
    ) -> None:
        self.classification_service = (
            classification_service or StoryClassificationService()
        )
        self.publication_readiness_service = (
            publication_readiness_service or StoryPublicationReadinessService()
        )
        self.read_time_service = read_time_service or StoryReadTimeService()

    async def evaluate(
        self,
        *,
        title: str,
        content: str,
        prompt: str | None = None,
        language: str | None = None,
        tags: list[str] | None = None,
        historical_ctr: float | None = None,
        completion_rate: float | None = None,
        save_rate: float | None = None,
        share_rate: float | None = None,
        recency_hours: int | None = None,
        comparison_contents: list[str] | None = None,
    ) -> dict[str, Any]:
        safe_title = self._require(title, "title")
        safe_content = self._require(content, "content")

        publication = await self.publication_readiness_service.evaluate(
            title=safe_title,
            content=safe_content,
            prompt=prompt,
            comparison_contents=comparison_contents,
            language=language,
            require_excerpt=True,
            require_summary=True,
        )
        classification = self.classification_service.classify(
            title=safe_title,
            content=safe_content,
            prompt=prompt,
        )
        read_time = self.read_time_service.estimate(
            content=safe_content,
            language=language,
        )

        novelty_score = self._novelty_score(
            quality=publication["quality"]["value"],
            duplication=publication["checks"],
            lexical_density=classification["signals"].get("lexical_density", 0.0),
            keyword_entropy=classification["signals"].get("keyword_entropy", 0.0),
        )
        readability_score = self._readability_score(read_time["metrics"])
        engagement_potential = self._engagement_potential(
            title=safe_title,
            content=safe_content,
            tags=tags or [],
            historical_ctr=historical_ctr,
            completion_rate=completion_rate,
            save_rate=save_rate,
            share_rate=share_rate,
        )
        freshness_score = self._freshness_score(recency_hours=recency_hours)
        feed_fit_score = self._feed_fit_score(
            publication_score=publication["quality"]["value"],
            publication_ready=publication["publication_ready"],
            novelty_score=novelty_score,
            readability_score=readability_score,
            engagement_potential=engagement_potential,
            freshness_score=freshness_score,
        )

        ranking_bucket = self._ranking_bucket(feed_fit_score)
        promotion_fit = publication["promotion_ready"] and feed_fit_score >= 76
        featured_fit = publication["promotion_ready"] and feed_fit_score >= 84

        return {
            "success": True,
            "ranking": {
                "feed_fit_score": feed_fit_score,
                "ranking_bucket": ranking_bucket,
                "promotion_fit": promotion_fit,
                "featured_fit": featured_fit,
            },
            "signals": {
                "novelty_score": novelty_score,
                "readability_score": readability_score,
                "engagement_potential": engagement_potential,
                "freshness_score": freshness_score,
                "quality_score": publication["quality"]["value"],
                "genre": classification["classification"].get("genre"),
                "tone": classification["classification"].get("tone"),
                "audience": classification["classification"].get("audience"),
                "language": language or classification["classification"].get("language") or "en",
                "estimated_read_minutes": read_time["reading_time"]["minutes_rounded"],
            },
            "supporting": {
                "publication": publication,
                "classification": classification,
                "read_time": read_time,
            },
        }

    def _novelty_score(
        self,
        *,
        quality: int,
        duplication: list[dict[str, Any]],
        lexical_density: float,
        keyword_entropy: float,
    ) -> float:
        duplicate_risk = 0.0
        for item in duplication:
            if item["code"] == "duplicate_risk":
                duplicate_risk = 22.0
                break

        density_component = min(25.0, max(0.0, lexical_density * 100 * 0.24))
        entropy_component = min(25.0, max(0.0, keyword_entropy * 8.0))
        quality_component = min(38.0, quality * 0.38)
        score = quality_component + density_component + entropy_component - duplicate_risk
        return round(max(0.0, min(100.0, score)), 2)

    def _readability_score(self, metrics: dict[str, Any]) -> float:
        avg_sentence = float(metrics.get("avg_words_per_sentence", 0.0))
        avg_paragraph = float(metrics.get("avg_words_per_paragraph", 0.0))
        word_count = int(metrics.get("word_count", 0))

        sentence_component = 100.0
        if avg_sentence > 18:
            sentence_component -= min(35.0, (avg_sentence - 18) * 2.4)

        paragraph_component = 100.0
        if avg_paragraph > 110:
            paragraph_component -= min(25.0, (avg_paragraph - 110) * 0.4)

        length_component = 100.0
        if word_count < 220:
            length_component -= 25.0
        elif word_count > 6000:
            length_component -= 18.0

        final_score = sentence_component * 0.5 + paragraph_component * 0.25 + length_component * 0.25
        return round(max(0.0, min(100.0, final_score)), 2)

    def _engagement_potential(
        self,
        *,
        title: str,
        content: str,
        tags: list[str],
        historical_ctr: float | None,
        completion_rate: float | None,
        save_rate: float | None,
        share_rate: float | None,
    ) -> float:
        opener = " ".join(content.split()[:45]).lower()
        title_lower = title.lower()

        tension_tokens = [
            "secret",
            "truth",
            "danger",
            "choice",
            "betrayal",
            "promise",
            "escape",
            "shadow",
            "before",
            "until",
            "why",
            "how",
        ]
        emotional_tokens = [
            "love",
            "fear",
            "loss",
            "hope",
            "regret",
            "hunger",
            "revenge",
            "mercy",
        ]

        token_hits = sum(1 for token in tension_tokens if token in opener or token in title_lower)
        emotional_hits = sum(1 for token in emotional_tokens if token in opener)
        tag_bonus = min(10.0, len([tag for tag in tags if tag.strip()]) * 1.4)

        base = 48.0 + min(18.0, token_hits * 3.0) + min(10.0, emotional_hits * 2.0) + tag_bonus

        if historical_ctr is not None:
            base += min(9.0, max(-8.0, historical_ctr * 30.0))
        if completion_rate is not None:
            base += min(8.0, max(-10.0, (completion_rate - 0.45) * 24.0))
        if save_rate is not None:
            base += min(4.0, max(-4.0, save_rate * 40.0))
        if share_rate is not None:
            base += min(5.0, max(-4.0, share_rate * 45.0))

        return round(max(0.0, min(100.0, base)), 2)

    def _freshness_score(self, *, recency_hours: int | None) -> float:
        if recency_hours is None:
            return 62.0
        if recency_hours <= 6:
            return 96.0
        if recency_hours <= 24:
            return 90.0
        if recency_hours <= 72:
            return 82.0
        if recency_hours <= 168:
            return 72.0
        if recency_hours <= 720:
            return 60.0
        return 48.0

    def _feed_fit_score(
        self,
        *,
        publication_score: int,
        publication_ready: bool,
        novelty_score: float,
        readability_score: float,
        engagement_potential: float,
        freshness_score: float,
    ) -> int:
        base = (
            publication_score * 0.35
            + novelty_score * 0.18
            + readability_score * 0.16
            + engagement_potential * 0.21
            + freshness_score * 0.10
        )
        if not publication_ready:
            base -= 18.0
        return max(0, min(100, int(round(base))))

    def _ranking_bucket(self, score: int) -> str:
        if score >= 88:
            return "featured_priority"
        if score >= 80:
            return "high_priority"
        if score >= 70:
            return "standard"
        if score >= 60:
            return "long_tail"
        return "suppressed"

    def _require(self, value: str, field_name: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
