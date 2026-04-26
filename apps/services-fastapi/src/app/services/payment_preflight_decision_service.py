from __future__ import annotations

from typing import Any

from app.services.account_trust_profile_service import AccountTrustProfileService
from app.services.payment_telemetry_service import PaymentTelemetryService


class PaymentPreflightDecisionService:
    """
    Canonical payment preflight decision.

    Called before NestJS initiates Stripe/Paystack/etc.
    """

    def __init__(
        self,
        *,
        payment_telemetry_service: PaymentTelemetryService | None = None,
        account_trust_profile_service: AccountTrustProfileService | None = None,
    ) -> None:
        self.payment_telemetry_service = (
            payment_telemetry_service or PaymentTelemetryService()
        )
        self.account_trust_profile_service = (
            account_trust_profile_service or AccountTrustProfileService()
        )

    def decide(
        self,
        *,
        order_id: str,
        account_id: str,
        ip: str,
        headers: dict[str, Any],
        amount: float,
        currency: str,
        failed_payments_24h: int = 0,
        attempts_last_1h: int = 0,
        distinct_cards_last_24h: int = 0,
        distinct_accounts_from_ip_24h: int = 0,
        recent_ip_events: list[dict[str, Any]] | None = None,
        account_age_days: int = 0,
        email_verified: bool = False,
        phone_verified: bool = False,
        completed_orders: int = 0,
        successful_watches_30d: int = 0,
        denied_watches_30d: int = 0,
        affiliate_payout_rejections_180d: int = 0,
        chargebacks_365d: int = 0,
        policy_flags_180d: int = 0,
        device_count_30d: int = 1,
    ) -> dict[str, Any]:
        telemetry = self.payment_telemetry_service.evaluate(
            order_id=order_id,
            account_id=account_id,
            ip=ip,
            headers=headers,
            amount=amount,
            currency=currency,
            failed_payments_24h=failed_payments_24h,
            attempts_last_1h=attempts_last_1h,
            distinct_cards_last_24h=distinct_cards_last_24h,
            distinct_accounts_from_ip_24h=distinct_accounts_from_ip_24h,
            recent_ip_events=recent_ip_events,
        )
        trust = self.account_trust_profile_service.evaluate(
            account_id=account_id,
            account_age_days=account_age_days,
            email_verified=email_verified,
            phone_verified=phone_verified,
            completed_orders=completed_orders,
            successful_watches_30d=successful_watches_30d,
            denied_watches_30d=denied_watches_30d,
            affiliate_payout_rejections_180d=affiliate_payout_rejections_180d,
            chargebacks_365d=chargebacks_365d,
            policy_flags_180d=policy_flags_180d,
            device_count_30d=device_count_30d,
        )

        telemetry_score = float(telemetry["payment_telemetry"]["risk_score"])
        trust_score = float(trust["account_trust"]["trust_score"])

        decision_score = round(
            max(
                0.0,
                min(
                    100.0,
                    telemetry_score * 0.78 + (100.0 - trust_score) * 0.22,
                ),
            ),
            2,
        )

        decision = self._decision(decision_score)
        reasons: list[str] = []

        if telemetry["payment_telemetry"]["decision"] != "allow":
            reasons.append("payment_telemetry_risk")
        if trust["account_trust"]["trust_band"] == "low":
            reasons.append("low_account_trust")
        if chargebacks_365d >= 1:
            reasons.append("chargeback_history")

        return {
            "success": True,
            "payment_preflight": {
                "allow": decision == "allow",
                "decision": decision,
                "decision_score": decision_score,
                "telemetry": telemetry["payment_telemetry"],
                "trust": trust["account_trust"],
                "reasons": reasons,
            },
        }

    def _decision(self, score: float) -> str:
        if score >= 70:
            return "deny"
        if score >= 43:
            return "review"
        return "allow"
