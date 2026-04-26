from __future__ import annotations

from typing import Any


class StoryCreatorSignalService:
    """
    Creator-level signal engine.

    Used for:
    - creator trust scoring
    - promotion risk shaping
    - discovery weighting
    - creator dashboard intelligence
    """

    def evaluate(
        self,
        *,
        total_published: int,
        publication_acceptance_rate: float,
        moderation_rejection_rate: float,
        average_story_quality_score: float,
        average_completion_rate: float | None = None,
        average_share_rate: float | None = None,
        average_save_rate: float | None = None,
        recent_policy_flags: int = 0,
        days_since_first_publish: int | None = None,
    ) -> dict[str, Any]:
        acceptance_component = self._acceptance_component(publication_acceptance_rate)
        moderation_component = self._moderation_component(
            moderation_rejection_rate=moderation_rejection_rate,
            recent_policy_flags=recent_policy_flags,
        )
        quality_component = self._quality_component(average_story_quality_score)
        engagement_component = self._engagement_component(
            completion_rate=average_completion_rate,
            share_rate=average_share_rate,
            save_rate=average_save_rate,
        )
        experience_component = self._experience_component(
            total_published=total_published,
            days_since_first_publish=days_since_first_publish,
        )

        trust_score = round(
            acceptance_component * 0.22
            + moderation_component * 0.26
            + quality_component * 0.24
            + engagement_component * 0.18
            + experience_component * 0.10,
            2,
        )

        trust_band = self._trust_band(trust_score)
        promotion_multiplier = self._promotion_multiplier(trust_score)
        review_intensity = self._review_intensity(
            trust_score=trust_score,
            moderation_rejection_rate=moderation_rejection_rate,
            recent_policy_flags=recent_policy_flags,
        )

        return {
            "success": True,
            "creator_signals": {
                "trust_score": trust_score,
                "trust_band": trust_band,
                "promotion_multiplier": promotion_multiplier,
                "review_intensity": review_intensity,
            },
            "components": {
                "acceptance_component": acceptance_component,
                "moderation_component": moderation_component,
                "quality_component": quality_component,
                "engagement_component": engagement_component,
                "experience_component": experience_component,
            },
        }

    def _acceptance_component(self, rate: float) -> float:
        bounded = max(0.0, min(1.0, rate))
        return round(40.0 + bounded * 60.0, 2)

    def _moderation_component(
        self,
        *,
        moderation_rejection_rate: float,
        recent_policy_flags: int,
    ) -> float:
        bounded = max(0.0, min(1.0, moderation_rejection_rate))
        base = 100.0 - bounded * 85.0 - min(24.0, recent_policy_flags * 6.0)
        return round(max(0.0, min(100.0, base)), 2)

    def _quality_component(self, average_score: float) -> float:
        return round(max(0.0, min(100.0, average_score)), 2)

    def _engagement_component(
        self,
        *,
        completion_rate: float | None,
        share_rate: float | None,
        save_rate: float | None,
    ) -> float:
        base = 58.0
        if completion_rate is not None:
            base += max(-15.0, min(20.0, (completion_rate - 0.45) * 40.0))
        if share_rate is not None:
            base += max(-6.0, min(10.0, share_rate * 55.0))
        if save_rate is not None:
            base += max(-6.0, min(10.0, save_rate * 60.0))
        return round(max(0.0, min(100.0, base)), 2)

    def _experience_component(
        self,
        *,
        total_published: int,
        days_since_first_publish: int | None,
    ) -> float:
        publish_component = min(70.0, max(0.0, total_published) * 3.0)
        age_component = 0.0
        if days_since_first_publish is not None:
            if days_since_first_publish >= 365:
                age_component = 30.0
            elif days_since_first_publish >= 90:
                age_component = 22.0
            elif days_since_first_publish >= 30:
                age_component = 14.0
            else:
                age_component = 8.0
        else:
            age_component = 12.0
        return round(max(0.0, min(100.0, publish_component + age_component)), 2)

    def _trust_band(self, score: float) -> str:
        if score >= 88:
            return "trusted_elite"
        if score >= 76:
            return "trusted"
        if score >= 62:
            return "standard"
        if score >= 48:
            return "guarded"
        return "restricted"

    def _promotion_multiplier(self, score: float) -> float:
        if score >= 88:
            return 1.12
        if score >= 76:
            return 1.05
        if score >= 62:
            return 1.00
        if score >= 48:
            return 0.92
        return 0.78

    def _review_intensity(
        self,
        *,
        trust_score: float,
        moderation_rejection_rate: float,
        recent_policy_flags: int,
    ) -> str:
        if trust_score < 48 or moderation_rejection_rate >= 0.25 or recent_policy_flags >= 3:
            return "strict"
        if trust_score < 62 or moderation_rejection_rate >= 0.15 or recent_policy_flags >= 1:
            return "heightened"
        if trust_score >= 88:
            return "light"
        return "standard"
