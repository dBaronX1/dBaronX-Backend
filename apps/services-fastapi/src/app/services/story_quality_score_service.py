from __future__ import annotations

import math
import re
from typing import Any

from app.services.story_classification_service import StoryClassificationService
from app.services.story_duplicate_detection_service import StoryDuplicateDetectionService
from app.services.story_moderation_service import StoryModerationService
from app.services.story_read_time_service import StoryReadTimeService


class StoryQualityScoreService:
    """
    Canonical quality scoring engine.

    Purpose:
    - pre-publication scoring
    - creator feedback
    - promotion eligibility input
    - discovery ranking signal
    """

    def __init__(
        self,
        *,
        moderation_service: StoryModerationService | None = None,
        classification_service: StoryClassificationService | None = None,
        read_time_service: StoryReadTimeService | None = None,
        duplicate_detection_service: StoryDuplicateDetectionService | None = None,
    ) -> None:
        self.moderation_service = moderation_service or StoryModerationService()
        self.classification_service = classification_service or StoryClassificationService()
        self.read_time_service = read_time_service or StoryReadTimeService()
        self.duplicate_detection_service = (
            duplicate_detection_service or StoryDuplicateDetectionService()
        )

    def score(
        self,
        *,
        title: str,
        content: str,
        prompt: str | None = None,
        comparison_contents: list[str] | None = None,
        language: str | None = None,
    ) -> dict[str, Any]:
        safe_title = self._normalize_required(title, "title")
        safe_content = self._normalize_required(content, "content")
        safe_prompt = prompt.strip() if prompt else None

        moderation = self.moderation_service.moderate(content=safe_content)
        classification = self.classification_service.classify(
            content=safe_content,
            prompt=safe_prompt,
            title=safe_title,
        )
        read_time = self.read_time_service.estimate(
            content=safe_content,
            language=language,
        )

        duplicate_analysis = None
        if comparison_contents:
            duplicate_analysis = self.duplicate_detection_service.analyze(
                content=safe_content,
                comparison_contents=comparison_contents,
                threshold=0.9,
            )

        metrics = self._extract_metrics(
            title=safe_title,
            content=safe_content,
            classification=classification,
            read_time=read_time,
            moderation=moderation,
            duplicate_analysis=duplicate_analysis,
        )
        final_score = self._aggregate_score(metrics)
        band = self._score_band(final_score)
        recommendations = self._recommendations(metrics, final_score)

        return {
            "success": True,
            "score": {
                "value": final_score,
                "band": band,
                "promotion_ready": final_score >= 78 and not moderation["blocked"],
                "publication_ready": final_score >= 72 and not moderation["blocked"],
            },
            "metrics": metrics,
            "moderation": moderation,
            "classification": classification,
            "read_time": read_time["reading_time"],
            "duplicate_analysis": duplicate_analysis,
            "recommendations": recommendations,
        }

    def _extract_metrics(
        self,
        *,
        title: str,
        content: str,
        classification: dict[str, Any],
        read_time: dict[str, Any],
        moderation: dict[str, Any],
        duplicate_analysis: dict[str, Any] | None,
    ) -> dict[str, Any]:
        word_count = read_time["metrics"]["word_count"]
        sentence_count = read_time["metrics"]["sentence_count"]
        avg_words_sentence = read_time["metrics"]["avg_words_per_sentence"]
        lexical_density = float(classification["signals"].get("lexical_density", 0))
        unique_tokens = int(classification["signals"].get("unique_token_count", 0))
        keyword_entropy = float(classification["signals"].get("keyword_entropy", 0))

        hook_strength = self._hook_strength(title=title, content=content)
        structure_score = self._structure_score(content)
        length_score = self._length_score(word_count)
        readability_score = self._readability_score(avg_words_sentence)
        vocabulary_score = self._vocabulary_score(lexical_density, unique_tokens, word_count)
        safety_penalty = self._safety_penalty(moderation)
        duplication_penalty = self._duplication_penalty(duplicate_analysis)
        repetition_penalty = self._repetition_penalty(content)
        mechanics_score = self._mechanics_score(content, sentence_count)
        intrigue_score = self._intrigue_score(content, keyword_entropy)

        return {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "avg_words_per_sentence": avg_words_sentence,
            "lexical_density": lexical_density,
            "unique_token_count": unique_tokens,
            "keyword_entropy": keyword_entropy,
            "hook_strength": hook_strength,
            "structure_score": structure_score,
            "length_score": length_score,
            "readability_score": readability_score,
            "vocabulary_score": vocabulary_score,
            "mechanics_score": mechanics_score,
            "intrigue_score": intrigue_score,
            "safety_penalty": safety_penalty,
            "duplication_penalty": duplication_penalty,
            "repetition_penalty": repetition_penalty,
        }

    def _aggregate_score(self, metrics: dict[str, Any]) -> int:
        raw = (
            metrics["hook_strength"] * 0.12
            + metrics["structure_score"] * 0.14
            + metrics["length_score"] * 0.08
            + metrics["readability_score"] * 0.14
            + metrics["vocabulary_score"] * 0.12
            + metrics["mechanics_score"] * 0.15
            + metrics["intrigue_score"] * 0.15
            + 24
            - metrics["safety_penalty"]
            - metrics["duplication_penalty"]
            - metrics["repetition_penalty"]
        )
        return max(0, min(100, int(round(raw))))

    def _score_band(self, score: int) -> str:
        if score >= 88:
            return "elite"
        if score >= 78:
            return "strong"
        if score >= 68:
            return "good"
        if score >= 55:
            return "needs_revision"
        return "weak"

    def _recommendations(self, metrics: dict[str, Any], final_score: int) -> list[str]:
        items: list[str] = []

        if metrics["hook_strength"] < 60:
            items.append("Strengthen the opening hook for mobile readers.")
        if metrics["structure_score"] < 62:
            items.append("Improve paragraph flow and narrative structure.")
        if metrics["readability_score"] < 60:
            items.append("Shorten dense sentences to improve readability.")
        if metrics["mechanics_score"] < 65:
            items.append("Clean punctuation and sentence mechanics.")
        if metrics["duplication_penalty"] > 10:
            items.append("Reduce overlap with existing stories before publishing.")
        if metrics["repetition_penalty"] > 8:
            items.append("Reduce repetitive wording and recurring sentence patterns.")
        if final_score >= 88:
            items.append("Quality is strong enough for premium discovery surfaces.")
        return items

    def _hook_strength(self, *, title: str, content: str) -> float:
        opening = " ".join(content.split()[:50]).lower()
        signals = 0
        signals += 1 if len(title.strip()) >= 12 else 0
        signals += 1 if "?" in title or "?" in opening else 0
        signals += 1 if any(
            token in opening for token in ["suddenly", "but", "until", "when", "before", "after"]
        ) else 0
        signals += 1 if re.search(r'["“].+?["”]', opening) else 0
        signals += 1 if any(
            token in opening for token in ["secret", "danger", "promise", "choice", "truth"]
        ) else 0
        return float(signals * 20)

    def _structure_score(self, content: str) -> float:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
        if not paragraphs:
            return 35.0
        lengths = [len(p.split()) for p in paragraphs]
        variance = 0.0
        if lengths:
            mean = sum(lengths) / len(lengths)
            variance = sum((length - mean) ** 2 for length in lengths) / len(lengths)
        penalty = min(35.0, math.sqrt(variance))
        return max(35.0, min(95.0, 88.0 - penalty))

    def _length_score(self, word_count: int) -> float:
        if 600 <= word_count <= 3500:
            return 92.0
        if 350 <= word_count < 600 or 3500 < word_count <= 5000:
            return 78.0
        if 220 <= word_count < 350:
            return 64.0
        return 48.0

    def _readability_score(self, avg_words_sentence: float) -> float:
        if avg_words_sentence <= 18:
            return 92.0
        if avg_words_sentence <= 24:
            return 78.0
        if avg_words_sentence <= 30:
            return 62.0
        return 45.0

    def _vocabulary_score(
        self,
        lexical_density: float,
        unique_tokens: int,
        word_count: int,
    ) -> float:
        diversity = unique_tokens / max(word_count, 1)
        base = lexical_density * 100 * 0.55 + diversity * 100 * 0.45
        return max(35.0, min(94.0, round(base, 2)))

    def _mechanics_score(self, content: str, sentence_count: int) -> float:
        double_spaces = content.count("  ")
        punctuation_errors = len(re.findall(r"[,.!?]{2,}", content))
        capitalization_penalty = 0
        for sentence in re.split(r"(?<=[.!?])\s+", content):
            stripped = sentence.strip()
            if stripped and stripped[0].isalpha() and stripped[0].islower():
                capitalization_penalty += 1

        penalty = (
            double_spaces * 1.2
            + punctuation_errors * 4.5
            + min(capitalization_penalty, max(sentence_count // 4, 1)) * 2.3
        )
        return max(35.0, min(95.0, 92.0 - penalty))

    def _intrigue_score(self, content: str, keyword_entropy: float) -> float:
        cliffhanger_terms = [
            "why",
            "how",
            "never",
            "until",
            "truth",
            "secret",
            "danger",
            "betrayal",
            "choice",
            "shadow",
        ]
        hit_count = sum(1 for term in cliffhanger_terms if term in content.lower())
        base = min(100.0, keyword_entropy * 24 + hit_count * 8)
        return max(35.0, round(base, 2))

    def _safety_penalty(self, moderation: dict[str, Any]) -> float:
        if moderation["blocked"]:
            return 40.0
        categories = moderation.get("categories", {})
        return float(sum(4.0 for _, flagged in categories.items() if flagged))

    def _duplication_penalty(self, duplicate_analysis: dict[str, Any] | None) -> float:
        if not duplicate_analysis:
            return 0.0
        best = duplicate_analysis.get("best_match")
        if not best:
            return 0.0
        similarity = float(best.get("similarity", 0))
        if similarity >= 0.95:
            return 28.0
        if similarity >= 0.9:
            return 18.0
        if similarity >= 0.82:
            return 8.0
        return 0.0

    def _repetition_penalty(self, content: str) -> float:
        tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9'\-]{1,}", content.lower())
        if not tokens:
            return 0.0
        repeated = 0
        seen_bigrams: dict[tuple[str, str], int] = {}
        for index in range(len(tokens) - 1):
            bigram = (tokens[index], tokens[index + 1])
            seen_bigrams[bigram] = seen_bigrams.get(bigram, 0) + 1
        for count in seen_bigrams.values():
            if count >= 4:
                repeated += count - 3
        return min(18.0, repeated * 1.4)

    def _normalize_required(self, value: str, field_name: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
