from __future__ import annotations

from typing import Any

from app.services.risk_scoring_service import RiskScoringService


class AffiliateAbuseService:
    """
    Canonical affiliate abuse evaluation layer.

    Focus:
    - rapid referral attempts
    - suspicious multi-account patterns
    - recycled device identity
    """

    def __init__(self, risk_scoring: RiskScoringService) -> None:
        self.risk_scoring = risk_scoring

    def evaluate(self, payload: dict[str, Any]) -> dict[str, Any]:
        score = self.risk_scoring.score_activity(
            {
                "vpn_detected": bool(payload.get("vpn_detected")),
                "proxy_detected": bool(payload.get("proxy_detected")),
                "device_mismatch": bool(payload.get("device_reuse_detected")),
                "rapid_requests": bool(payload.get("rapid_clicks")),
                "suspicious_pattern": bool(payload.get("multi_account_pattern")),
            }
        )

        return {
            "allowed": score["allowed"],
            "score": score["score"],
            "level": score["level"],
            "reason": None if score["allowed"] else "affiliate_activity_flagged",
        }
