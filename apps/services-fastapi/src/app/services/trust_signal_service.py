from __future__ import annotations

from typing import Any

from app.schemas.common import DeviceSummary, GeoSummary
from app.schemas.risk import RiskSignal
from app.services.supabase_service import SupabaseService


class TrustSignalService:
    def __init__(self, supabase: SupabaseService) -> None:
        self.supabase = supabase

    async def collect_user_signals(
        self,
        *,
        user_id: str | None,
        email: str | None,
        ip: str | None,
        geo: GeoSummary | None,
        device: DeviceSummary | None,
    ) -> list[RiskSignal]:
        signals: list[RiskSignal] = []

        if not user_id and email:
            signals.append(
                RiskSignal(
                    code="ANONYMOUS_EMAIL_CONTEXT",
                    category="identity",
                    score=8,
                    weight=1.0,
                    message="Anonymous request using only email context",
                )
            )

        if geo and geo.is_proxy_suspected:
            signals.append(
                RiskSignal(
                    code="PROXY_SUSPECTED",
                    category="network",
                    score=18,
                    weight=1.2,
                    message="IP appears proxy-like",
                    metadata={"country": geo.country, "city": geo.city},
                )
            )

        if geo and geo.is_vpn_suspected:
            signals.append(
                RiskSignal(
                    code="VPN_SUSPECTED",
                    category="network",
                    score=16,
                    weight=1.1,
                    message="VPN-like characteristics detected",
                    metadata={"country": geo.country},
                )
            )

        if device and device.is_bot_like:
            signals.append(
                RiskSignal(
                    code="BOT_LIKE_USER_AGENT",
                    category="device",
                    score=35,
                    weight=1.4,
                    message="User agent appears bot-like",
                    blocking=True,
                )
            )

        if user_id:
            profile = await self.supabase.get_user_risk_profile(user_id)
            if profile:
                risk_score = float(profile.get("risk_score") or 0)
                strikes = int(profile.get("strike_count") or 0)
                if risk_score >= 70:
                    signals.append(
                        RiskSignal(
                            code="HIGH_USER_RISK_PROFILE",
                            category="history",
                            score=26,
                            weight=1.3,
                            message="User has elevated historical risk profile",
                            metadata={"profile_risk_score": risk_score, "strike_count": strikes},
                        )
                    )
                elif strikes >= 3:
                    signals.append(
                        RiskSignal(
                            code="REPEATED_RISK_STRIKES",
                            category="history",
                            score=18,
                            weight=1.1,
                            message="User has repeated risk strikes",
                            metadata={"strike_count": strikes},
                        )
                    )

        if device and device.fingerprint:
            existing_device = await self.supabase.get_device_record(device.fingerprint)
            if existing_device:
                linked_users = int(existing_device.get("linked_user_count") or 0)
                if linked_users >= 4:
                    signals.append(
                        RiskSignal(
                            code="MULTI_ACCOUNT_DEVICE_CLUSTER",
                            category="device",
                            score=24,
                            weight=1.2,
                            message="Device is linked to multiple user identities",
                            metadata={"linked_user_count": linked_users},
                        )
                    )

        return signals

    @staticmethod
    def summarize_signal_scores(signals: list[RiskSignal]) -> dict[str, Any]:
        weighted_total = sum(signal.score * signal.weight for signal in signals)
        blocking = any(signal.blocking for signal in signals)
        categories = sorted({signal.category for signal in signals})
        return {
            "weighted_total": round(weighted_total, 2),
            "blocking": blocking,
            "categories": categories,
            "count": len(signals),
        }
