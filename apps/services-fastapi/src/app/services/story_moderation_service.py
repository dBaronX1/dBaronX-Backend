from __future__ import annotations

import re
from typing import Any


class StoryModerationService:
    """
    Canonical moderation engine for AI Stories.

    It provides:
    - deterministic first-pass moderation for speed and bandwidth
    - review-safe flags for NestJS admin and creator workflows
    - subsystem-compatible decisions for stories, ads, affiliate promotion, and W2E surfaces
    """

    _BLOCK_PATTERNS = {
        "extreme_violence": [
            r"\bdismember(?:ed|ment)?\b",
            r"\bgraphic gore\b",
            r"\bdecapitat(?:e|ed|ion)\b",
        ],
        "sexual_minors": [
            r"\bunderage sex\b",
            r"\bchild sexual\b",
            r"\bminor sexual\b",
        ],
        "self_harm_instruction": [
            r"\bhow to kill yourself\b",
            r"\bways to self[- ]harm\b",
            r"\bhow to cut yourself\b",
        ],
        "terrorism_praise": [
            r"\bpraise .*terror(?:ist|ism)\b",
            r"\bjoin .*terror(?:ist|ism)\b",
        ],
    }

    _REVIEW_PATTERNS = {
        "violence": [
            r"\bkill(?:ed|ing)?\b",
            r"\bmurder(?:ed|er)?\b",
            r"\bblood\b",
            r"\bweapon\b",
        ],
        "sexual_content": [
            r"\bsex\b",
            r"\bnude\b",
            r"\berotic\b",
            r"\bexplicit\b",
        ],
        "substances": [
            r"\bdrug(?:s)?\b",
            r"\bcocaine\b",
            r"\bheroin\b",
            r"\boverdose\b",
        ],
        "hate_or_abuse": [
            r"\bslur\b",
            r"\bgenocide\b",
            r"\bethnic cleansing\b",
        ],
    }

    def moderate(
        self,
        *,
        content: str,
        title: str | None = None,
        prompt: str | None = None,
    ) -> dict[str, Any]:
        body = self._normalize(content)
        joined = " ".join(
            part for part in [title or "", prompt or "", body] if part
        ).strip()

        blocked_flags = self._match_patterns(joined, self._BLOCK_PATTERNS)
        review_flags = self._match_patterns(joined, self._REVIEW_PATTERNS)

        blocked = bool(blocked_flags)
        requires_review = bool(review_flags) or blocked

        severity = self._severity(blocked_flags, review_flags)
        safety_score = self._safety_score(blocked_flags, review_flags)

        return {
            "success": True,
            "blocked": blocked,
            "requires_review": requires_review,
            "severity": severity,
            "safety_score": safety_score,
            "blocked_flags": blocked_flags,
            "review_flags": review_flags,
            "safe_for_public_discovery": not blocked and not requires_review,
            "safe_for_affiliate_promotion": not blocked and severity in {"low", "medium"},
            "safe_for_watch_to_earn_promotion": not blocked and severity == "low",
        }

    def _normalize(self, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("content is required")
        return cleaned

    def _match_patterns(
        self,
        text: str,
        mapping: dict[str, list[str]],
    ) -> list[str]:
        lowered = text.lower()
        matched: list[str] = []
        for category, patterns in mapping.items():
            if any(re.search(pattern, lowered) for pattern in patterns):
                matched.append(category)
        return matched

    def _severity(
        self,
        blocked_flags: list[str],
        review_flags: list[str],
    ) -> str:
        if blocked_flags:
            return "critical"
        if len(review_flags) >= 3:
            return "high"
        if len(review_flags) == 2:
            return "medium"
        if len(review_flags) == 1:
            return "low"
        return "none"

    def _safety_score(
        self,
        blocked_flags: list[str],
        review_flags: list[str],
    ) -> float:
        if blocked_flags:
            return 0.0

        penalty = len(review_flags) * 0.22
        score = 1.0 - penalty
        return max(0.0, round(score, 4))
