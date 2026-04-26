from __future__ import annotations

from typing import Any


class StoryDiscoveryRankingService:
    """
    Rank candidate stories for discovery surfaces.

    Inputs are expected to already contain moderation / quality / signal metadata.
    This service converts that into one canonical ranking score usable by:
    - discovery feed
    - promoted rail selection
    - affiliate story cards
    - watch-to-earn teaser selection
    """

    def rank(self, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ranked: list[dict[str, Any]] = []

        for candidate in candidates:
            quality = float(candidate.get("quality_score") or 0.0)
            discovery = float(candidate.get("discovery_score") or 0.0)
            ctr = float(candidate.get("ctr") or 0.0)
            completion = float(candidate.get("completion_rate") or 0.0)
            moderation_penalty = 0.20 if candidate.get("review_required") else 0.0
            promo_boost = 0.06 if candidate.get("promotion_active") else 0.0
            freshness = float(candidate.get("freshness_score") or 0.0)

            ranking_score = max(
                0.0,
                min(
                    1.0,
                    quality * 0.29
                    + discovery * 0.26
                    + ctr * 0.16
                    + completion * 0.14
                    + freshness * 0.11
                    + promo_boost
                    - moderation_penalty,
                ),
            )

            row = {
                **candidate,
                "ranking_score": round(ranking_score, 4),
                "rank_bucket": self._bucket(ranking_score),
            }
            ranked.append(row)

        ranked.sort(
            key=lambda item: (
                item["ranking_score"],
                float(item.get("ctr") or 0.0),
                float(item.get("quality_score") or 0.0),
            ),
            reverse=True,
        )

        for index, item in enumerate(ranked, start=1):
            item["rank_position"] = index

        return ranked

    def _bucket(self, score: float) -> str:
        if score >= 0.82:
            return "elite"
        if score >= 0.70:
            return "strong"
        if score >= 0.56:
            return "viable"
        return "weak"
