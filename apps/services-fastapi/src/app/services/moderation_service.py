from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ModerationDecision:
    passed: bool
    reasons: list[str]


class ModerationService:
    """
    Canonical lightweight moderation gate.

    This is intentionally deterministic and safe as a first-line rules engine.
    It can be extended later with provider-backed moderation without changing
    the route or generation service contracts.
    """

    _blocked_terms = {
        "child sexual abuse",
        "explosive recipe",
        "how to make a bomb",
        "bioweapon instructions",
    }

    def moderate_prompt(self, prompt: str) -> ModerationDecision:
        normalized = prompt.lower()
        reasons = [term for term in self._blocked_terms if term in normalized]
        return ModerationDecision(
            passed=len(reasons) == 0,
            reasons=reasons,
        )

    def moderate_output(self, content: str) -> ModerationDecision:
        normalized = content.lower()
        reasons = [term for term in self._blocked_terms if term in normalized]
        return ModerationDecision(
            passed=len(reasons) == 0,
            reasons=reasons,
        )
