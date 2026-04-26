from __future__ import annotations

from typing import Any

from app.services.risk_scoring_service import RiskScoringService


class PaymentRiskService:
    """
    Canonical payment risk surface.

    Checkout-specific logic:
    - amount escalation
    - geo inconsistency
    - high-risk patterns
    """

    def __init__(self, risk_scoring: RiskScoringService) -> None:
        self.risk_scoring = risk_scoring

    def evaluate(self, payload: dict[str, Any]) -> dict[str, Any]:
        amount = float(payload.get("amount") or 0)
        mismatch = bool(payload.get("billing_shipping_mismatch"))
        high_amount = amount >= float(payload.get("high_amount_threshold") or 2500)

        result = self.risk_scoring.score_checkout(
            {
                **payload,
                "device_mismatch": mismatch,
                "suspicious_pattern": high_amount or bool(payload.get("suspicious_pattern")),
            }
        )

        return {
            "allowed": result["allowed"],
            "score": result["score"],
            "level": result["level"],
            "fingerprint": result["fingerprint"],
            "ip_analysis": result["ip_analysis"],
            "reason": None if result["allowed"] else "payment_risk_threshold_exceeded",
        }
