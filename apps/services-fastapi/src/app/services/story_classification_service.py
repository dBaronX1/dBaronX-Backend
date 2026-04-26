from __future__ import annotations

from typing import Any

from app.services.story_metadata_service import StoryMetadataService


class StoryClassificationService:
    """
    Canonical rule-informed story classifier for the dBaronX intelligence layer.

    Purpose:
    - lightweight, low-bandwidth classification for frontend and NestJS consumption
    - provider-independent signal extraction for discovery, promotion, and moderation
    - deterministic fallback classification even when external AI providers are unavailable
    """

    def __init__(
        self,
        *,
        metadata_service: StoryMetadataService | None = None,
    ) -> None:
        self.metadata_service = metadata_service or StoryMetadataService()

    def classify(
        self,
        *,
        content: str,
        prompt: str | None = None,
        genre_hint: str | None = None,
        tone_hint: str | None = None,
        language_hint: str | None = None,
    ) -> dict[str, Any]:
        normalized_content = " ".join(content.strip().split())
        normalized_prompt = " ".join((prompt or "").strip().split())

        combined = f"{normalized_prompt}\n{normalized_content}".lower()
        word_count = len(normalized_content.split())

        metadata = self.metadata_service.build_from_story(
            content=normalized_content,
            prompt=prompt or "",
            genre=genre_hint or self._infer_genre(combined),
            tone=tone_hint or self._infer_tone(combined),
            language=language_hint or self._infer_language(normalized_content),
            title_hint=None,
        )

        safety_signals = self._safety_signals(combined)
        maturity = self._maturity_rating(safety_signals)
        readability = self._readability_bucket(word_count)

        return {
            "success": True,
            "classification": {
                "genre": metadata["genre"],
                "tone": metadata["tone"],
                "language": metadata["language"],
                "word_count": metadata["word_count"],
                "readability_bucket": readability,
                "maturity_rating": maturity,
                "content_flags": safety_signals["flags"],
                "discovery_signals": metadata["discovery_signals"],
                "promotion_hints": metadata["promotion_hints"],
                "themes": self._themes(combined),
                "pace": self._pace(word_count),
                "commercial_fit": self._commercial_fit(metadata, maturity),
            },
        }

    def _infer_genre(self, content: str) -> str:
        rules = {
            "romance": ["love", "kiss", "heart", "romance", "lover", "wedding"],
            "horror": ["blood", "ghost", "dark", "scream", "haunted", "monster"],
            "fantasy": ["kingdom", "magic", "dragon", "sword", "spell", "realm"],
            "science_fiction": ["spaceship", "galaxy", "android", "future", "orbit", "quantum"],
            "thriller": ["escape", "murder", "pursuit", "secret", "conspiracy", "surveillance"],
            "adventure": ["journey", "desert", "island", "quest", "map", "expedition"],
        }
        return self._highest_scoring_label(content, rules, fallback="fiction")

    def _infer_tone(self, content: str) -> str:
        rules = {
            "dark": ["fear", "ash", "cold", "shadow", "grief", "dead"],
            "hopeful": ["hope", "light", "promise", "rise", "heal", "tomorrow"],
            "playful": ["laugh", "joke", "mischief", "smile", "fun", "cheer"],
            "dramatic": ["betrayal", "fate", "destiny", "loss", "sacrifice", "cry"],
            "suspenseful": ["waited", "footsteps", "locked", "unknown", "silence", "hidden"],
        }
        return self._highest_scoring_label(content, rules, fallback="engaging")

    def _infer_language(self, content: str) -> str:
        # Lightweight heuristic fallback. Production-safe default is English.
        ascii_ratio = (
            sum(1 for ch in content if ord(ch) < 128) / max(1, len(content))
        )
        return "en" if ascii_ratio > 0.85 else "unknown"

    def _safety_signals(self, content: str) -> dict[str, Any]:
        flags: list[str] = []
        if any(term in content for term in ["suicide", "self-harm", "kill myself"]):
            flags.append("self_harm_signal")
        if any(term in content for term in ["rape", "sexual assault"]):
            flags.append("sexual_violence_signal")
        if any(term in content for term in ["extremist", "terror", "bomb manual"]):
            flags.append("extremism_signal")
        if any(term in content for term in ["gore", "dismembered", "intestines"]):
            flags.append("graphic_violence_signal")

        return {
            "flags": flags,
            "risk_score": min(len(flags) * 0.25, 1.0),
        }

    def _maturity_rating(self, safety_signals: dict[str, Any]) -> str:
        flag_count = len(safety_signals["flags"])
        if flag_count >= 3:
            return "restricted"
        if flag_count >= 1:
            return "mature"
        return "general"

    def _readability_bucket(self, word_count: int) -> str:
        if word_count < 600:
            return "short_form"
        if word_count < 1800:
            return "standard"
        if word_count < 5000:
            return "long_form"
        return "extended"

    def _themes(self, content: str) -> list[str]:
        theme_rules = {
            "love": ["love", "lover", "romance", "heart"],
            "power": ["king", "power", "control", "throne"],
            "survival": ["survive", "hunger", "escape", "storm"],
            "identity": ["name", "memory", "self", "become"],
            "revenge": ["revenge", "vengeance", "repay", "betrayal"],
            "freedom": ["freedom", "escape", "release", "liberation"],
        }
        hits: list[str] = []
        for label, keywords in theme_rules.items():
            if any(keyword in content for keyword in keywords):
                hits.append(label)
        return hits[:6]

    def _pace(self, word_count: int) -> str:
        if word_count < 700:
            return "fast"
        if word_count < 1800:
            return "balanced"
        return "slow_burn"

    def _commercial_fit(self, metadata: dict[str, Any], maturity: str) -> dict[str, Any]:
        promotable = maturity != "restricted"
        discovery_fit = "high" if metadata["word_count"] >= 500 and promotable else "medium"
        ad_teaser_fit = "high" if len(metadata["excerpt"].split()) >= 20 and promotable else "medium"
        affiliate_fit = "high" if promotable else "low"

        return {
            "promotable": promotable,
            "discovery_fit": discovery_fit,
            "ad_teaser_fit": ad_teaser_fit,
            "affiliate_fit": affiliate_fit,
        }

    def _highest_scoring_label(
        self,
        content: str,
        rules: dict[str, list[str]],
        *,
        fallback: str,
    ) -> str:
        best_label = fallback
        best_score = 0

        for label, keywords in rules.items():
            score = sum(content.count(keyword) for keyword in keywords)
            if score > best_score:
                best_label = label
                best_score = score

        return best_label
