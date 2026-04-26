from __future__ import annotations

from typing import Any


class StoryQualityService:
    """
    Low-cost, deterministic quality scorer.

    Used for:
    - generation post-checks
    - draft publish readiness hints
    - campaign quality thresholds
    - creator dashboard warnings
    """

    def evaluate(
        self,
        *,
        title: str,
        content: str,
        excerpt: str,
        tags: list[str],
    ) -> dict[str, Any]:
        word_count = len(content.split())
        paragraph_count = len([p for p in content.split("\n") if p.strip()])
        title_score = self._title_score(title)
        depth_score = self._depth_score(word_count, paragraph_count)
        variation_score = self._variation_score(content)
        excerpt_score = self._excerpt_score(excerpt)
        tag_score = self._tag_score(tags)

        score = max(
            0.0,
            min(
                1.0,
                title_score * 0.16
                + depth_score * 0.30
                + variation_score * 0.22
                + excerpt_score * 0.18
                + tag_score * 0.14,
            ),
        )

        readiness = self._publish_readiness(score=score, word_count=word_count)

        return {
            "score": round(score, 4),
            "title_score": round(title_score, 4),
            "depth_score": round(depth_score, 4),
            "variation_score": round(variation_score, 4),
            "excerpt_score": round(excerpt_score, 4),
            "tag_score": round(tag_score, 4),
            "word_count": word_count,
            "paragraph_count": paragraph_count,
            "publish_ready": readiness["publish_ready"],
            "promotion_ready": readiness["promotion_ready"],
            "feedback": readiness["feedback"],
        }

    def _title_score(self, title: str) -> float:
        words = title.strip().split()
        if not words:
            return 0.0
        score = 0.45
        if 3 <= len(words) <= 8:
            score += 0.30
        if len(title.strip()) >= 18:
            score += 0.12
        return min(1.0, score)

    def _depth_score(self, word_count: int, paragraph_count: int) -> float:
        score = 0.0
        if word_count >= 200:
            score += 0.42
        if word_count >= 450:
            score += 0.24
        if paragraph_count >= 4:
            score += 0.18
        if paragraph_count >= 7:
            score += 0.10
        return min(1.0, score)

    def _variation_score(self, content: str) -> float:
        words = [word.lower() for word in content.split() if word.strip()]
        if not words:
            return 0.0
        unique_ratio = len(set(words)) / len(words)
        return min(1.0, unique_ratio * 1.45)

    def _excerpt_score(self, excerpt: str) -> float:
        length = len(excerpt.strip())
        if length < 50:
            return 0.18
        if length < 110:
            return 0.56
        if length < 220:
            return 0.84
        return 0.93

    def _tag_score(self, tags: list[str]) -> float:
        if not tags:
            return 0.10
        if len(tags) <= 2:
            return 0.48
        if len(tags) <= 5:
            return 0.82
        return 0.92

    def _publish_readiness(self, *, score: float, word_count: int) -> dict[str, Any]:
        feedback: list[str] = []

        if word_count < 200:
            feedback.append("Increase story depth before publishing.")
        if score < 0.62:
            feedback.append("Improve hook, structure, or pacing.")
        if score >= 0.62:
            feedback.append("Story is solid enough for publishing.")
        if score >= 0.74 and word_count >= 250:
            feedback.append("Story is strong enough for promotion campaigns.")

        return {
            "publish_ready": score >= 0.62 and word_count >= 180,
            "promotion_ready": score >= 0.74 and word_count >= 220,
            "feedback": feedback,
        }
