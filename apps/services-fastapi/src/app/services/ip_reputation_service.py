from __future__ import annotations

import ipaddress
from typing import Any


class IpReputationService:
    """
    Lightweight local reputation scoring.
    Designed for mobile-first low-bandwidth operations and can later be
    enriched by external providers without changing the contract.
    """

    def assess(
        self,
        *,
        ip: str,
        recent_events: list[dict[str, Any]] | None = None,
        distinct_accounts_24h: int = 0,
        failed_captcha_1h: int = 0,
        failed_payments_24h: int = 0,
        denied_watch_claims_24h: int = 0,
    ) -> dict[str, Any]:
        safe_ip = self._normalize_ip(ip)
        recent_events = recent_events or []

        private_or_reserved = self._private_or_reserved(safe_ip)
        event_volume = len(recent_events)
        countries = {str(event.get("country") or "").upper() for event in recent_events if event.get("country")}
        asn_count = len({str(event.get("asn") or "") for event in recent_events if event.get("asn")})

        risk_score = 0.0
        reasons: list[str] = []

        if private_or_reserved:
            risk_score += 8.0
            reasons.append("ip_is_private_or_reserved")

        if distinct_accounts_24h >= 4:
            risk_score += min(30.0, distinct_accounts_24h * 4.0)
            reasons.append("high_account_fanout")

        if failed_captcha_1h >= 3:
            risk_score += min(20.0, failed_captcha_1h * 3.5)
            reasons.append("captcha_failures")

        if failed_payments_24h >= 2:
            risk_score += min(18.0, failed_payments_24h * 4.5)
            reasons.append("payment_failures")

        if denied_watch_claims_24h >= 3:
            risk_score += min(20.0, denied_watch_claims_24h * 3.5)
            reasons.append("watch_denials")

        if event_volume >= 20:
            risk_score += 10.0
            reasons.append("high_event_volume")

        if len(countries) > 2:
            risk_score += 10.0
            reasons.append("geo_volatility")

        if asn_count > 2:
            risk_score += 8.0
            reasons.append("asn_volatility")

        level = self._level(risk_score)

        return {
            "success": True,
            "ip_reputation": {
                "ip": safe_ip,
                "risk_score": round(min(100.0, risk_score), 2),
                "risk_level": level,
                "signals": {
                    "private_or_reserved": private_or_reserved,
                    "distinct_accounts_24h": distinct_accounts_24h,
                    "failed_captcha_1h": failed_captcha_1h,
                    "failed_payments_24h": failed_payments_24h,
                    "denied_watch_claims_24h": denied_watch_claims_24h,
                    "recent_event_volume": event_volume,
                    "country_count": len(countries),
                    "asn_count": asn_count,
                },
                "reasons": reasons,
            },
        }

    def _normalize_ip(self, ip: str) -> str:
        cleaned = ip.strip()
        parsed = ipaddress.ip_address(cleaned)
        return str(parsed)

    def _private_or_reserved(self, ip: str) -> bool:
        parsed = ipaddress.ip_address(ip)
        return bool(
            parsed.is_private
            or parsed.is_loopback
            or parsed.is_reserved
            or parsed.is_link_local
            or parsed.is_multicast
        )

    def _level(self, score: float) -> str:
        if score >= 65:
            return "high"
        if score >= 35:
            return "medium"
        return "low"
