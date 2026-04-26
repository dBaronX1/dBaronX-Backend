from __future__ import annotations

from typing import Any


class DecisionConsistencyService:
    """
    Validates cross-decision consistency.

    Used to detect contradictions such as:
    - allow + high deny score
    - eligible story + deny creator promotion risk
    - allow payment preflight + deny fraud decision
    """

    def evaluate(
        self,
        *,
        surfaces: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        issues: list[dict[str, Any]] = []

        payment_preflight = surfaces.get("payment_preflight")
        fraud_decision = surfaces.get("fraud_decision")
        reward_decision = surfaces.get("reward_decision")
        telemetry_integrity = surfaces.get("telemetry_integrity")
        creator_promotion_risk = surfaces.get("creator_promotion_risk")
        story_quote_signal = surfaces.get("story_quote_signal")

        if payment_preflight and fraud_decision:
            if (
                payment_preflight.get("allow") is True
                and fraud_decision.get("decision") == "deny"
            ):
                issues.append(
                    {
                        "code": "payment_vs_fraud_conflict",
                        "severity": "high",
                        "message": "Payment preflight allowed while fraud decision denied.",
                    }
                )

        if reward_decision and telemetry_integrity:
            if (
                reward_decision.get("allow") is True
                and telemetry_integrity.get("decision") == "deny"
            ):
                issues.append(
                    {
                        "code": "reward_vs_telemetry_conflict",
                        "severity": "high",
                        "message": "Reward allowed while telemetry integrity denied.",
                    }
                )

        if creator_promotion_risk and story_quote_signal:
            if (
                story_quote_signal.get("eligible") is True
                and creator_promotion_risk.get("decision") == "deny"
            ):
                issues.append(
                    {
                        "code": "story_quote_vs_promotion_risk_conflict",
                        "severity": "medium",
                        "message": "Quote says eligible while creator promotion risk denies.",
                    }
                )

        severity = self._severity(issues)

        return {
            "success": True,
            "decision_consistency": {
                "consistent": len(issues) == 0,
                "severity": severity,
                "issue_count": len(issues),
                "issues": issues,
            },
        }

    def _severity(self, issues: list[dict[str, Any]]) -> str:
        if any(issue["severity"] == "high" for issue in issues):
            return "high"
        if any(issue["severity"] == "medium" for issue in issues):
            return "medium"
        return "none"
