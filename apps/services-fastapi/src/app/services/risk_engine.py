from __future__ import annotations

from typing import Any

from app.core.config import Settings, get_settings
from app.schemas.common import GeoSummary
from app.schemas.risk import (
    RiskAssessmentRequest,
    RiskAssessmentResult,
    RiskSignal,
    VelocityWindow,
)
from app.services.device_fingerprint_service import DeviceFingerprintService
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService
from app.services.trust_signal_service import TrustSignalService


class RiskEngine:
    def __init__(
        self,
        *,
        redis: RedisService,
        supabase: SupabaseService,
        trust_signals: TrustSignalService,
        settings: Settings | None = None,
    ) -> None:
        self.redis = redis
        self.supabase = supabase
        self.trust_signals = trust_signals
        self.settings = settings or get_settings()

    async def assess(self, request: RiskAssessmentRequest) -> RiskAssessmentResult:
        device = DeviceFingerprintService.build_summary(
            user_agent=request.user_agent,
            ip=request.ip,
            explicit_fingerprint=request.fingerprint,
        )

        geo = GeoSummary(
            ip=request.ip,
            country=str(request.metadata.get("country") or "") or None,
            region=str(request.metadata.get("region") or "") or None,
            city=str(request.metadata.get("city") or "") or None,
            timezone=str(request.metadata.get("timezone") or "") or None,
            is_proxy_suspected=bool(request.metadata.get("is_proxy_suspected", False)),
            is_vpn_suspected=bool(request.metadata.get("is_vpn_suspected", False)),
        )

        signals: list[RiskSignal] = []
        velocity_windows: list[VelocityWindow] = []

        if request.ip:
            count = await self.redis.increment_with_ttl(
                f"risk:ip:{request.event_type}:{request.ip}",
                ttl_seconds=60,
            )
            limit = 30 if request.event_type == "checkout" else 45
            velocity_windows.append(
                VelocityWindow(
                    key=f"ip:{request.ip}",
                    count=count,
                    limit=limit,
                    window_seconds=60,
                    exceeded=count > limit,
                )
            )
            if count > limit:
                signals.append(
                    RiskSignal(
                        code="IP_VELOCITY_EXCEEDED",
                        category="velocity",
                        score=25,
                        weight=1.3,
                        message="IP velocity exceeded safe threshold",
                        metadata={"count": count, "limit": limit},
                        blocking=request.event_type in {"checkout", "payout"},
                    )
                )

        if request.user_id:
            count = await self.redis.increment_with_ttl(
                f"risk:user:{request.event_type}:{request.user_id}",
                ttl_seconds=120,
            )
            limit = 20 if request.event_type == "ad_watch" else 12
            velocity_windows.append(
                VelocityWindow(
                    key=f"user:{request.user_id}",
                    count=count,
                    limit=limit,
                    window_seconds=120,
                    exceeded=count > limit,
                )
            )
            if count > limit:
                signals.append(
                    RiskSignal(
                        code="USER_VELOCITY_EXCEEDED",
                        category="velocity",
                        score=18,
                        weight=1.2,
                        message="User velocity exceeded safe threshold",
                        metadata={"count": count, "limit": limit},
                    )
                )

        if request.amount is not None:
            if request.amount >= 1000:
                signals.append(
                    RiskSignal(
                        code="HIGH_TRANSACTION_AMOUNT",
                        category="financial",
                        score=12,
                        weight=1.1,
                        message="Elevated transaction amount",
                        metadata={"amount": request.amount, "currency": request.currency},
                    )
                )
            if request.event_type == "payout" and request.amount >= 250:
                signals.append(
                    RiskSignal(
                        code="LARGE_PAYOUT_REQUEST",
                        category="financial",
                        score=16,
                        weight=1.2,
                        message="Large payout request requires tighter review",
                        metadata={"amount": request.amount},
                    )
                )

        if request.event_type == "ad_watch" and request.duration is not None:
            if request.duration < self.settings.watch_min_duration_seconds:
                signals.append(
                    RiskSignal(
                        code="TOO_SHORT_WATCH_DURATION",
                        category="telemetry",
                        score=35,
                        weight=1.4,
                        message="Watch duration below minimum accepted threshold",
                        metadata={"duration": request.duration},
                        blocking=True,
                    )
                )
            elif request.duration < 10:
                signals.append(
                    RiskSignal(
                        code="LOW_WATCH_DURATION",
                        category="telemetry",
                        score=10,
                        weight=1.0,
                        message="Watch duration is unusually low",
                        metadata={"duration": request.duration},
                    )
                )

        trust_signals = await self.trust_signals.collect_user_signals(
            user_id=request.user_id,
            email=request.email,
            ip=request.ip,
            geo=geo,
            device=device,
        )
        signals.extend(trust_signals)

        weighted_score = round(sum(signal.score * signal.weight for signal in signals), 2)
        blocking = any(signal.blocking for signal in signals)

        if blocking or weighted_score >= 75:
            decision = "block"
            level = "critical" if weighted_score >= 90 or blocking else "high"
            allowed = False
            reason = "Risk policy blocked request"
        elif weighted_score >= 35:
            decision = "review"
            level = "medium" if weighted_score < 60 else "high"
            allowed = True
            reason = "Request allowed with elevated risk"
        else:
            decision = "allow"
            level = "low"
            allowed = True
            reason = "Request passed risk checks"

        result = RiskAssessmentResult(
            allowed=allowed,
            decision=decision,
            level=level,
            score=weighted_score,
            reason=reason,
            signals=signals,
            velocity_windows=velocity_windows,
            request_id=request.request_id,
            fingerprint=device.fingerprint,
            geo=geo,
            device=device,
            metadata={
                "event_type": request.event_type,
                "user_id": request.user_id,
                "order_id": request.order_id,
                "ad_id": request.ad_id,
            },
        )

        await self.supabase.insert_risk_event(
            {
                "event_type": request.event_type,
                "user_id": request.user_id,
                "email": request.email,
                "ip": request.ip,
                "request_id": request.request_id,
                "decision": result.decision,
                "level": result.level,
                "score": result.score,
                "reason": result.reason,
                "fingerprint": result.fingerprint,
                "signals": [signal.model_dump(mode="json") for signal in result.signals],
                "metadata": result.metadata,
            }
        )

        if device.fingerprint:
            await self.supabase.upsert_device_record(
                {
                    "fingerprint": device.fingerprint,
                    "last_ip": request.ip,
                    "last_user_agent": request.user_agent,
                    "last_seen_at": request.metadata.get("occurred_at"),
                    "user_id": request.user_id,
                }
            )

        return result
