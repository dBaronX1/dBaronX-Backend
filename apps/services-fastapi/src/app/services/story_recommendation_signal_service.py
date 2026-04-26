from __future__ import annotations

from typing import Any

from app.services.story_classification_service import StoryClassificationService
from app.services.story_tag_generation_service import StoryTagGenerationService


class StoryRecommendationSignalService:
    """
    Canonical recommendation-signal generator.

    Outputs low-cost structured signals for:
    - feed ranking
    - related stories
    - promoted stories
    - story → ecommerce association
    - affiliate story promotion grouping
    """

    def __init__(
        self,
        *,
        classification_service: StoryClassificationService | None = None,
        tag_generation_service: StoryTagGenerationService | None = None,
    ) -> None:
        self.classification_service = classification_service or StoryClassificationService()
        self.tag_generation_service = tag_generation_service or StoryTagGenerationService()

    def generate(
        self,
        *,
        content: str,
        prompt: str | None = None,
        title: str | None = None,
        creator_id: str | None = None,
        language: str | None = None,
    ) -> dict[str, Any]:
        classification = self.classification_service.classify(
            content=content,
            prompt=prompt,
            title=title,
        )
        tags = self.tag_generation_service.generate_tags(
            content=content,
            prompt=prompt,
            title=title,
            max_tags=10,
        )["tags"]

        return {
            "success": True,
            "signals": {
                "primary_genre": classification["genre"],
                "primary_tone": classification["tone"],
                "primary_audience": classification["audience"],
                "language": language or "en",
                "tags": tags,
                "feature_vector": self._build_feature_vector(classification, tags),
                "routing_keys": self._build_routing_keys(
                    genre=classification["genre"],
                    tone=classification["tone"],
                    audience=classification["audience"],
                    tags=tags,
                    creator_id=creator_id,
                ),
            },
        }

    def _build_feature_vector(
        self,
        classification: dict[str, Any],
        tags: list[str],
    ) -> dict[str, float | int]:
        readability = classification.get("readability", {})
        signals = classification.get("signals", {})
        return {
            "estimated_flesch_reading_ease": float(
                readability.get("estimated_flesch_reading_ease", 0)
            ),
            "avg_sentence_length": float(readability.get("avg_sentence_length", 0)),
            "token_count": int(signals.get("token_count", 0)),
            "unique_token_count": int(signals.get("unique_token_count", 0)),
            "lexical_density": float(signals.get("lexical_density", 0)),
            "keyword_entropy": float(signals.get("keyword_entropy", 0)),
            "tag_count": len(tags),
        }

    def _build_routing_keys(
        self,
        *,
        genre: str,
        tone: str,
        audience: str,
        tags: list[str],
        creator_id: str | None,
    ) -> list[str]:
        keys = [
            f"genre:{genre}",
            f"tone:{tone}",
            f"audience:{audience}",
        ]
        if creator_id:
            keys.append(f"creator:{creator_id}")
        keys.extend(f"tag:{tag}" for tag in tags[:6])
        deduped: list[str] = []
        seen: set[str] = set()
        for key in keys:
            if key not in seen:
                seen.add(key)
                deduped.append(key)
        return deduped
