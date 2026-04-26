from __future__ import annotations

from typing import Any

from app.services.device_fingerprint_service import DeviceFingerprintService
from app.services.ip_reputation_service import IpReputationService


class PaymentTelemetryService:
    """
    Canonical lightweight payment risk telemetry engine.

    Used by NestJS before payment initiation and during payment verification
    to reduce:
    - carding-like behavior
    - rapid retry abuse
    - multi-account payment misuse
    - suspicious geo/device mismatch
    """

    def __init__(
        self,
        *,
        device_fingerprint_service: DeviceFingerprintService | None = None,
        ip_reputation_service: IpReputationService | None = None,
    ) -> None:
        self.device_fingerprint_service = (
            device_fingerprint_service or DeviceFingerprintService()
        )
        self.ip_reputation_service = ip_reputation_service or IpReputationService()

    def evaluate(
        self,
        *,
        order_id: str,
        account_id: str | None,
        ip: str,
        headers: dict[str, Any],
        amount: float,
        currency: str,
        failed_payments_24h: int = 0,
        attempts_last_1h: int = 0,
        distinct_cards_last_24h: int = 0,
        distinct_accounts_from_ip_24h: int = 0,
        recent_ip_events: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        safe_order_id = self._require(order_id, "order_id")
        safe_currency = self._require(currency, "currency").upper()

        fingerprint = self.device_fingerprint_service.build(
            headers=headers,
            ip=ip,
            account_id=account_id,
            fingerprint_seed=order_id,
        )
        ip_reputation = self.ip_reputation_service.assess(
            ip=ip,
            recent_events=recent_ip_events,
            distinct_accounts_24h=distinct_accounts_from_ip_24h,
            failed_payments_24h=failed_payments_24h,
        )

        risk_score = 0.0
        reasons: list[str] = []

        if amount >= 1500:
            risk_score += 10.0
            reasons.append("high_amount")
        elif amount >= 500:
            risk_score += 4.0
            reasons.append("elevated_amount")

        if attempts_last_1h >= 5:
            risk_score += min(24.0, attempts_last_1h * 3.5)
            reasons.append("payment_attempt_burst")

        if distinct_cards_last_24h >= 3:
            risk_score += min(24.0, distinct_cards_last_24h * 5.0)
            reasons.append("multi_card_pattern")

        if distinct_accounts_from_ip_24h >= 4:
            risk_score += min(18.0, distinct_accounts_from_ip_24h * 3.5)
            reasons.append("ip_multi_account_pattern")

        risk_score += ip_reputation["ip_reputation"]["risk_score"] * 0.55

        stability_score = fingerprint["fingerprint"]["stability_score"]
        if stability_score < 40:
            risk_score += 12.0
            reasons.append("low_device_stability")

        if fingerprint["fingerprint"]["device_family"] == "mobile" and amount >= 2000:
            risk_score += 4.0
            reasons.append("mobile_high_value")

        decision = self._decision(risk_score)

        return {
            "success": True,
            "payment_telemetry": {
                "order_id": safe_order_id,
                "currency": safe_currency,
                "risk_score": round(min(100.0, risk_score), 2),
                "decision": decision,
                "allow": decision == "allow",
                "fingerprint": fingerprint["fingerprint"],
                "ip_reputation": ip_reputation["ip_reputation"],
                "signals": {
                    "amount": amount,
                    "attempts_last_1h": attempts_last_1h,
                    "failed_payments_24h": failed_payments_24h,
                    "distinct_cards_last_24h": distinct_cards_last_24h,
                    "distinct_accounts_from_ip_24h": distinct_accounts_from_ip_24h,
                },
                "reasons": reasons,
            },
        }

    def _decision(self, score: float) -> str:
        if score >= 70:
            return "deny"
        if score >= 45:
            return "review"
        return "allow"

    def _require(self, value: str, field_name: str) -> str:
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned
