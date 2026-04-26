from __future__ import annotations

from typing import Any


class AffiliateVelocityService:
    """
    Canonical affiliate velocity detector.

    Evaluates velocity and fanout anomalies across:
    - referral clicks
    - signups
    - qualified watches
    - payout request bursts
    """

    def evaluate(
        self,
        *,
        affiliate_user_id: str,
        clicks_last_10m: int = 0,
        clicks_last_1h: int = 0,
        distinct_ips_last_1h: int = 0,
        signups_last_24h: int = 0,
        qualified_watches_last_24h: int = 0,
        payouts_requested_last_7d: int = 0,
        duplicate_device_clusters_last_24h: int = 0,
        conversion_rate_24h: float | None = None,
    ) -> dict[str, Any]:
        safe_user_id = self._require(affiliate_user_id, "affiliate_user_id")

        reasons: list[str] = []
        risk_score = 0.0

        if clicks_last_10m >= 80:
            risk_score += 22.0
            reasons.append("click_spike_10m")
        elif clicks_last_10m >= 40:
            risk_score += 10.0
            reasons.append("elevated_click_rate_10m")

        if clicks_last_1h >= 300:
            risk_score += 18.0
            reasons.append("click_spike_1h")
        elif clicks_last_1h >= 180:
            risk_score += 8.0
            reasons.append("elevated_click_rate_1h")

        if distinct_ips_last_1h <= 2 and clicks_last_1h >= 50:
            risk_score += 16.0
            reasons.append("low_ip_diversity")

        if signups_last_24h >= 40:
            risk_score += 10.0
            reasons.append("signup_surge")

        if qualified_watches_last_24h >= 120:
            risk_score += 12.0
            reasons.append("watch_surge")

        if payouts_requested_last_7d >= 3:
            risk_score += 10.0
            reasons.append("payout_burst")

        if duplicate_device_clusters_last_24h >= 3:
            risk_score += min(20.0, duplicate_device_clusters_last_24h * 5.0)
            reasons.append("duplicate_device_clusters")

        if conversion_rate_24h is not None:
            if conversion_rate_24h >= 0.8 and clicks_last_1h >= 25:
                risk_score += 12.0
                reasons.append("implausibly_high_conversion")
            elif conversion_rate_24h <= 0.001 and clicks_last_1h >= 120:
                risk_score += 8.0
                reasons.append("traffic_quality_anomaly")

        risk_level = self._risk_level(risk_score)

        return {
            "success": True,
            "affiliate_velocity": {
                "affiliate_user_id": safe_user_id,
                "risk_score": round(min(100.0, risk_score), 2),
                "risk_level": risk_level,
                "allow": risk_score < 45.0,
                "signals": {
                    "clicks_last_10m": clicks_last_10m,
                    "clicks_last_1h": clicks_last_1h,
                    "distinct_ips_last_1h": distinct_ips_last_1h,
                    "signups_last_24h": signups_last_24h,
                    "qualified_watches_last_24h": qualified_watches_last_24h,
                    "payouts_requested_last_7d": payouts_requested_last_7d,
                    "duplicate_device_clusters_last_24h": duplicate_device_clusters_last_24h,
                    "conversion_rate_24h": conversion_rate_24h,
                },
                "reasons": reasons,
            },
        }

    def _risk_level(self, score: float) -> str:
        if score >= 65:
            return "high"
        if score >= 35:
            return "medium"
        return "low"

    def _require(self, value: str, field_name: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
