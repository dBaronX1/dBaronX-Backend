from __future__ import annotations

from typing import Any

from app.services.account_trust_profile_service import AccountTrustProfileService
from app.services.affiliate_velocity_service import AffiliateVelocityService
from app.services.ip_reputation_service import IpReputationService


class AffiliatePayoutRiskService:
    """
    Canonical affiliate payout risk engine.

    Used before NestJS approves or auto-releases payout requests.
    """

    def __init__(
        self,
        *,
        account_trust_profile_service: AccountTrustProfileService | None = None,
        affiliate_velocity_service: AffiliateVelocityService | None = None,
        ip_reputation_service: IpReputationService | None = None,
    ) -> None:
        self.account_trust_profile_service = (
            account_trust_profile_service or AccountTrustProfileService()
        )
        self.affiliate_velocity_service = (
            affiliate_velocity_service or AffiliateVelocityService()
        )
        self.ip_reputation_service = ip_reputation_service or IpReputationService()

    def evaluate(
        self,
        *,
        account_id: str,
        payout_amount: float,
        payout_method: str,
        ip: str,
        recent_ip_events: list[dict[str, Any]] | None = None,
        distinct_accounts_24h: int = 0,
        failed_captcha_1h: int = 0,
        affiliate_velocity: dict[str, Any] | None = None,
        account_profile: dict[str, Any] | None = None,
        recent_payout_requests_30d: int = 0,
        average_payout_amount_90d: float | None = None,
    ) -> dict[str, Any]:
        safe_account_id = self._require(account_id, "account_id")
        safe_method = self._require(payout_method, "payout_method").lower()

        trust = self.account_trust_profile_service.evaluate(
            account_id=safe_account_id,
            account_age_days=int((account_profile or {}).get("account_age_days", 0)),
            email_verified=bool((account_profile or {}).get("email_verified", False)),
            phone_verified=bool((account_profile or {}).get("phone_verified", False)),
            completed_orders=int((account_profile or {}).get("completed_orders", 0)),
            successful_watches_30d=int((account_profile or {}).get("successful_watches_30d", 0)),
            denied_watches_30d=int((account_profile or {}).get("denied_watches_30d", 0)),
            affiliate_payout_rejections_180d=int(
                (account_profile or {}).get("affiliate_payout_rejections_180d", 0)
            ),
            chargebacks_365d=int((account_profile or {}).get("chargebacks_365d", 0)),
            policy_flags_180d=int((account_profile or {}).get("policy_flags_180d", 0)),
            device_count_30d=int((account_profile or {}).get("device_count_30d", 1)),
        )
        velocity = self.affiliate_velocity_service.evaluate(
            affiliate_user_id=safe_account_id,
            clicks_last_10m=int((affiliate_velocity or {}).get("clicks_last_10m", 0)),
            clicks_last_1h=int((affiliate_velocity or {}).get("clicks_last_1h", 0)),
            distinct_ips_last_1h=int((affiliate_velocity or {}).get("distinct_ips_last_1h", 0)),
            signups_last_24h=int((affiliate_velocity or {}).get("signups_last_24h", 0)),
            qualified_watches_last_24h=int(
                (affiliate_velocity or {}).get("qualified_watches_last_24h", 0)
            ),
            payouts_requested_last_7d=int(
                (affiliate_velocity or {}).get("payouts_requested_last_7d", 0)
            ),
            duplicate_device_clusters_last_24h=int(
                (affiliate_velocity or {}).get("duplicate_device_clusters_last_24h", 0)
            ),
            conversion_rate_24h=(affiliate_velocity or {}).get("conversion_rate_24h"),
        )
        ip_risk = self.ip_reputation_service.assess(
            ip=ip,
            recent_events=recent_ip_events,
            distinct_accounts_24h=distinct_accounts_24h,
            failed_captcha_1h=failed_captcha_1h,
        )

        risk_score = 0.0
        reasons: list[str] = []

        risk_score += velocity["affiliate_velocity"]["risk_score"] * 0.42
        risk_score += ip_risk["ip_reputation"]["risk_score"] * 0.26
        risk_score += (100.0 - trust["account_trust"]["trust_score"]) * 0.32

        if payout_amount >= 1000:
            risk_score += 14.0
            reasons.append("high_payout_amount")
        elif payout_amount >= 250:
            risk_score += 6.0
            reasons.append("elevated_payout_amount")

        if recent_payout_requests_30d >= 4:
            risk_score += min(18.0, recent_payout_requests_30d * 3.5)
            reasons.append("frequent_payout_requests")

        if average_payout_amount_90d is not None and average_payout_amount_90d > 0:
            if payout_amount >= average_payout_amount_90d * 3:
                risk_score += 16.0
                reasons.append("payout_spike_vs_history")

        if safe_method in {"crypto", "manual"}:
            risk_score += 4.0
            reasons.append("manual_or_crypto_method")

        decision = self._decision(risk_score)

        return {
            "success": True,
            "affiliate_payout_risk": {
                "account_id": safe_account_id,
                "payout_method": safe_method,
                "risk_score": round(min(100.0, risk_score), 2),
                "decision": decision,
                "allow": decision == "allow",
                "trust": trust["account_trust"],
                "velocity": velocity["affiliate_velocity"],
                "ip_reputation": ip_risk["ip_reputation"],
                "reasons": reasons,
            },
        }

    def _decision(self, score: float) -> str:
        if score >= 72:
            return "deny"
        if score >= 44:
            return "review"
        return "allow"

    def _require(self, value: str, field_name: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
