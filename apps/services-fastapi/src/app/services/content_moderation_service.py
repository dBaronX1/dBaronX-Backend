from __future__ import annotations

from typing import Any


class ContentModerationService:
    """
    Deterministic moderation gate for story and promotion content.

    This is not the final moderation universe.
    It is the canonical first-pass moderation layer that is:
    - fast
    - explainable
    - low-cost
    - safe for synchronous API use
    """

    _blocked_terms: dict[str, list[str]] = {
        "extreme_violence": [
            "dismember",
            "behead",
            "torture chamber",
        ],
        "sexual_exploitation": [
            "child sexual",
            "underage explicit",
            "minor sexvideo",
        ],
        "self_harm": [
            "how to kill yourself",
            "best suicide method",
            "self-harm tutorial",
        ],
        "hate_extremism": [
            "ethnic cleansing",
            "join extremist",
            "terror manifesto",
        ],
    }

    _sensitive_terms: dict[str, list[str]] = {
        "graphic_violence": [
            "blood-soaked",
            "guts",
            "mutilated",
            "severed",
        ],
        "adult_sexual": [
            "explicit sex",
            "hardcore",
            "pornographic",
        ],
        "criminal_instruction": [
            "how to forge",
            "how to bypass law",
            "steal identities",
        ],
    }

    def assess_text(self, text: str) -> dict[str, Any]:
        normalized = self._normalize(text)

        blocked_flags = self._collect_flags(normalized, self._blocked_terms)
        sensitive_flags = self._collect_flags(normalized, self._sensitive_terms)

        allowed = len(blocked_flags) == 0
        review_required = not allowed or len(sensitive_flags) > 0

        risk_score = self._risk_score(
            blocked_count=len(blocked_flags),
            sensitive_count=len(sensitive_flags),
            length=len(normalized),
        )

        return {
            "allowed": allowed,
            "review_required": review_required,
            "risk_score": risk_score,
            "blocked_flags": blocked_flags,
            "sensitive_flags": sensitive_flags,
            "flags": blocked_flags + sensitive_flags,
            "safe_for_promotion": allowed and len(sensitive_flags) == 0,
            "safe_for_affiliate": allowed and "adult_sexual" not in sensitive_flags,
            "safe_for_watch_to_earn": allowed and len(sensitive_flags) == 0,
        }

    def _collect_flags(
        self,
        normalized: str,
        lexicon: dict[str, list[str]],
    ) -> list[str]:
        flags: list[str] = []
        for label, terms in lexicon.items():
            if any(term in normalized for term in terms):
                flags.append(label)
        return flags

    def _risk_score(
        self,
        *,
        blocked_count: int,
        sensitive_count: int,
        length: int,
    ) -> float:
        base = 0.03
        base += blocked_count * 0.45
        base += sensitive_count * 0.12
        if length < 40:
            base += 0.04
        return round(max(0.0, min(1.0, base)), 4)

    def _normalize(self, text: str) -> str:
        return " ".join(text.lower().strip().split())
