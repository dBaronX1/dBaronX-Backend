from __future__ import annotations

from dataclasses import dataclass

from app.core.logging import get_logger
from app.schemas.risk import (
    AffiliateRiskRequest,
    CheckoutRiskRequest,
    WatchRiskRequest,
)
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService

logger = get_logger("app.risk_service")


@dataclass(slots=True)
class RiskScore:
    allowed: bool
    score: float
    level: str
    reason: str
    signals: dict


class RiskService:
    def __init__(
        self,
        *,
        redis: RedisService,
        supabase: SupabaseService,
    ) -> None:
        self.redis = redis
        self.supabase = supabase

    async def score_checkout(self, payload: CheckoutRiskRequest) -> dict:
        score = 0.0
        signals: dict = {}

        velocity_key = f"risk:checkout:user:{payload.user_id or payload.email}"
        velocity = await self.redis.increment_counter(velocity_key, ttl_seconds=300)
        signals["velocity_5m"] = velocity
        if velocity > 6:
            score += 0.35

        if payload.amount >= 500:
            score += 0.15
            signals["high_amount"] = True

        if payload.ip:
            blocked = await self.redis.get_json(f"manual:block:{payload.ip}")
            if blocked:
                score += 0.6
                signals["manual_ip_block"] = True

        decision = self._finalize(score, signals, default_reason="checkout evaluated")

        await self.supabase.insert_risk_event(
            {
                "event_type": "checkout_risk",
                "user_id": payload.user_id,
                "decision": "allow" if decision.allowed else "deny",
                "level": decision.level,
                "score": decision.score,
                "reason": decision.reason,
                "metadata": signals,
            }
        )

        return self._to_dict(decision)

    async def score_affiliate(self, payload: AffiliateRiskRequest) -> dict:
        score = 0.0
        signals: dict = {}

        velocity_key = f"risk:affiliate:user:{payload.user_id}"
        velocity = await self.redis.increment_counter(velocity_key, ttl_seconds=300)
        signals["velocity_5m"] = velocity

        if velocity > 20:
            score += 0.45

        if payload.ip:
            blocked = await self.redis.get_json(f"manual:block:{payload.ip}")
            if blocked:
                score += 0.6
                signals["manual_ip_block"] = True

        decision = self._finalize(score, signals, default_reason="affiliate event evaluated")

        await self.supabase.insert_risk_event(
            {
                "event_type": "affiliate_risk",
                "user_id": payload.user_id,
                "decision": "allow" if decision.allowed else "deny",
                "level": decision.level,
                "score": decision.score,
                "reason": decision.reason,
                "metadata": signals,
            }
        )

        return self._to_dict(decision)

    async def score_watch(self, payload: WatchRiskRequest) -> dict:
        score = 0.0
        signals: dict = {}

        session_key = f"risk:watch:user:{payload.user_id}:ad:{payload.ad_id}"
        repeats = await self.redis.increment_counter(session_key, ttl_seconds=24 * 3600)
        signals["repeat_count_24h"] = repeats

        if repeats > 1:
            score += 0.5

        if payload.duration_seconds < payload.minimum_required_seconds:
            score += 0.5
            signals["duration_below_threshold"] = True

        if payload.ip:
            blocked = await self.redis.get_json(f"manual:block:{payload.ip}")
            if blocked:
                score += 0.6
                signals["manual_ip_block"] = True

        decision = self._finalize(score, signals, default_reason="watch event evaluated")

        await self.supabase.insert_risk_event(
            {
                "event_type": "watch_risk",
                "user_id": payload.user_id,
                "decision": "allow" if decision.allowed else "deny",
                "level": decision.level,
                "score": decision.score,
                "reason": decision.reason,
                "metadata": signals,
            }
        )

        return self._to_dict(decision)

    @staticmethod
    def _finalize(score: float, signals: dict, default_reason: str) -> RiskScore:
        score = min(max(score, 0.0), 1.0)

        if score >= 0.7:
            return RiskScore(
                allowed=False,
                score=round(score, 4),
                level="high",
                reason="blocked_by_risk_policy",
                signals=signals,
            )
        if score >= 0.35:
            return RiskScore(
                allowed=True,
                score=round(score, 4),
                level="medium",
                reason=default_reason,
                signals=signals,
            )
        return RiskScore(
            allowed=True,
            score=round(score, 4),
            level="low",
            reason=default_reason,
            signals=signals,
        )

    @staticmethod
    def _to_dict(decision: RiskScore) -> dict:
        return {
            "success": True,
            "allowed": decision.allowed,
            "score": decision.score,
            "level": decision.level,
            "reason": decision.reason,
            "signals": decision.signals,
        }
