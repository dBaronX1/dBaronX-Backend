from __future__ import annotations

from typing import Any

from app.services.account_trust_profile_service import AccountTrustProfileService
from app.services.affiliate_velocity_service import AffiliateVelocityService
from app.services.payment_telemetry_service import PaymentTelemetryService
from app.services.telemetry_integrity_service import TelemetryIntegrityService


class FraudDecisionService:
    """
    Canonical cross-subsystem fraud decision engine.

    This is the high-value intelligence contract for NestJS and other services.
    It unifies decisions for:
    - watch-to-earn reward flows
    - affiliate conversion/payout flows
    - payment preflight flows

    Output stays compact, deterministic, and safe for mobile-first systems.
    """

    def __init__(
        self,
        *,
        telemetry_integrity_service: TelemetryIntegrityService | None = None,
        affiliate_velocity_service: AffiliateVelocityService | None = None,
        payment_telemetry_service: PaymentTelemetryService | None = None,
        account_trust_profile_service: AccountTrustProfileService | None = None,
    ) -> None:
        self.telemetry_integrity_service = (
            telemetry_integrity_service or TelemetryIntegrityService()
        )
        self.affiliate_velocity_service = (
            affiliate_velocity_service or AffiliateVelocityService()
        )
        self.payment_telemetry_service = (
            payment_telemetry_service or PaymentTelemetryService()
        )
        self.account_trust_profile_service = (
            account_trust_profile_service or AccountTrustProfileService()
        )

    def decide(
        self,
        *,
        flow_type: str,
        account_id: str,
        ip: str,
        headers: dict[str, Any],
        session_payload: dict[str, Any] | None = None,
        affiliate_payload: dict[str, Any] | None = None,
        payment_payload: dict[str, Any] | None = None,
        account_profile: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        normalized_flow = self._normalize_flow(flow_type)
        safe_account_id = self._require(account_id, "account_id")

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

        signals: dict[str, Any] = {
            "trust": trust["account_trust"],
        }
        reasons: list[str] = []
        score = (100.0 - float(trust["account_trust"]["trust_score"])) * 0.18

        if normalized_flow == "watch":
            session_payload = session_payload or {}
            watch = self.telemetry_integrity_service.evaluate_watch_integrity(
                session_id=str(session_payload.get("session_id", "")),
                headers=headers,
                ip=ip,
                account_id=safe_account_id,
                declared_duration_seconds=int(session_payload.get("declared_duration_seconds", 1)),
                heartbeat_intervals_ms=list(session_payload.get("heartbeat_intervals_ms", [])),
                total_heartbeats=int(session_payload.get("total_heartbeats", 0)),
                hidden_event_count=int(session_payload.get("hidden_event_count", 0)),
                blur_event_count=int(session_payload.get("blur_event_count", 0)),
                seek_event_count=int(session_payload.get("seek_event_count", 0)),
                playback_rate_max=float(session_payload.get("playback_rate_max", 1.0)),
                muted_ratio=float(session_payload.get("muted_ratio", 0.0)),
                duplicate_claim_attempts=int(session_payload.get("duplicate_claim_attempts", 0)),
                recent_ip_events=list(session_payload.get("recent_ip_events", [])),
                distinct_accounts_24h=int(session_payload.get("distinct_accounts_24h", 0)),
                failed_captcha_1h=int(session_payload.get("failed_captcha_1h", 0)),
                denied_watch_claims_24h=int(session_payload.get("denied_watch_claims_24h", 0)),
            )
            watch_score = float(watch["integrity"]["composite_risk_score"])
            score += watch_score * 0.82
            signals["watch"] = watch["integrity"]

            if watch["integrity"]["decision"] != "allow":
                reasons.append("watch_integrity_risk")

        elif normalized_flow == "affiliate":
            affiliate_payload = affiliate_payload or {}
            affiliate = self.affiliate_velocity_service.evaluate(
                affiliate_user_id=safe_account_id,
                clicks_last_10m=int(affiliate_payload.get("clicks_last_10m", 0)),
                clicks_last_1h=int(affiliate_payload.get("clicks_last_1h", 0)),
                distinct_ips_last_1h=int(affiliate_payload.get("distinct_ips_last_1h", 0)),
                signups_last_24h=int(affiliate_payload.get("signups_last_24h", 0)),
                qualified_watches_last_24h=int(
                    affiliate_payload.get("qualified_watches_last_24h", 0)
                ),
                payouts_requested_last_7d=int(
                    affiliate_payload.get("payouts_requested_last_7d", 0)
                ),
                duplicate_device_clusters_last_24h=int(
                    affiliate_payload.get("duplicate_device_clusters_last_24h", 0)
                ),
                conversion_rate_24h=affiliate_payload.get("conversion_rate_24h"),
            )
            affiliate_score = float(affiliate["affiliate_velocity"]["risk_score"])
            score += affiliate_score * 0.76
            signals["affiliate"] = affiliate["affiliate_velocity"]

            if affiliate["affiliate_velocity"]["risk_level"] != "low":
                reasons.append("affiliate_velocity_risk")

        elif normalized_flow == "payment":
            payment_payload = payment_payload or {}
            payment = self.payment_telemetry_service.evaluate(
                order_id=str(payment_payload.get("order_id", "")),
                account_id=safe_account_id,
                ip=ip,
                headers=headers,
                amount=float(payment_payload.get("amount", 0.0)),
                currency=str(payment_payload.get("currency", "USD")),
                failed_payments_24h=int(payment_payload.get("failed_payments_24h", 0)),
                attempts_last_1h=int(payment_payload.get("attempts_last_1h", 0)),
                distinct_cards_last_24h=int(payment_payload.get("distinct_cards_last_24h", 0)),
                distinct_accounts_from_ip_24h=int(
                    payment_payload.get("distinct_accounts_from_ip_24h", 0)
                ),
                recent_ip_events=list(payment_payload.get("recent_ip_events", [])),
            )
            payment_score = float(payment["payment_telemetry"]["risk_score"])
            score += payment_score * 0.80
            signals["payment"] = payment["payment_telemetry"]

            if payment["payment_telemetry"]["decision"] != "allow":
                reasons.append("payment_telemetry_risk")
        else:
            raise ValueError("Unsupported flow_type")

        final_score = round(max(0.0, min(100.0, score)), 2)
        decision = self._decision(final_score)

        if trust["account_trust"]["trust_band"] == "low":
            reasons.append("low_account_trust")

        return {
            "success": True,
            "fraud_decision": {
                "flow_type": normalized_flow,
                "account_id": safe_account_id,
                "allow": decision == "allow",
                "decision": decision,
                "decision_score": final_score,
                "signals": signals,
                "reasons": reasons,
            },
        }

    def _normalize_flow(self, value: str) -> str:
        normalized = str(value).strip().lower()
        allowed = {"watch", "affiliate", "payment"}
        if normalized not in allowed:
            raise ValueError("flow_type must be one of: watch, affiliate, payment")
        return normalized

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
