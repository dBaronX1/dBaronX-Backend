from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import Settings, get_settings
from app.schemas.risk import AdWatchRiskRequest
from app.schemas.telemetry import (
    WatchSessionEvidence,
    WatchValidationRequest,
    WatchValidationResult,
    WatchValidationSummary,
)
from app.services.nestjs_client import NestJSClient
from app.services.redis_service import RedisService
from app.services.risk_engine import RiskEngine
from app.services.supabase_service import SupabaseService
from app.services.trust_signal_service import TrustSignalService


class WatchValidationService:
    def __init__(
        self,
        *,
        redis: RedisService,
        supabase: SupabaseService,
        nestjs: NestJSClient,
        settings: Settings | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.redis = redis
        self.supabase = supabase
        self.nestjs = nestjs
        self.risk_engine = RiskEngine(
            redis=redis,
            supabase=supabase,
            trust_signals=TrustSignalService(supabase),
            settings=self.settings,
        )

    async def validate(self, payload: WatchValidationRequest) -> WatchValidationResult:
        summary = self._summarize(
            payload.events,
            expected_min_duration_seconds=payload.expected_min_duration_seconds,
        )

        risk_result = await self.risk_engine.assess(
            AdWatchRiskRequest(
                user_id=payload.user_id,
                ad_id=payload.ad_id,
                duration=payload.claimed_duration_seconds,
                ip=payload.ip,
                user_agent=payload.user_agent,
                request_id=payload.request_id,
                fingerprint=payload.fingerprint,
                session_id=payload.session_id,
                affiliate_code=payload.referral_code,
                metadata={
                    **payload.metadata,
                    "session_id": payload.session_id,
                    "captcha_verified": payload.captcha_verified,
                    "continuity_ratio": summary.continuity_ratio,
                    "visible_heartbeat_count": summary.visible_heartbeat_count,
                    "hidden_heartbeat_count": summary.hidden_heartbeat_count,
                    "suspicious_flags": summary.suspicious_flags,
                },
            )
        )

        allowed = bool(risk_result.allowed)
        reasons: list[str] = []

        if not payload.captcha_verified:
            allowed = False
            reasons.append("Captcha verification missing")

        if payload.claimed_duration_seconds < payload.expected_min_duration_seconds:
            allowed = False
            reasons.append("Claimed watch duration below required threshold")

        if summary.evidence_duration_seconds < payload.expected_min_duration_seconds:
            allowed = False
            reasons.append("Telemetry evidence duration below required threshold")

        if summary.continuity_ratio < 0.6:
            allowed = False
            reasons.append("Heartbeat continuity below required threshold")

        if summary.hidden_heartbeat_count > summary.visible_heartbeat_count:
            allowed = False
            reasons.append("Too much hidden or unfocused playback")

        if summary.max_playback_rate > 1.5:
            allowed = False
            reasons.append("Playback rate exceeds trusted threshold")

        if risk_result.decision == "block":
            allowed = False
            reasons.append(risk_result.reason)

        if not reasons:
            reasons.append("Watch session passed validation")

        result = WatchValidationResult(
            allowed=allowed,
            score=max(risk_result.score, 0),
            level=risk_result.level,
            reason="; ".join(reasons),
            session_id=payload.session_id,
            user_id=payload.user_id,
            ad_id=payload.ad_id,
            summary=summary,
            signals=[signal.model_dump(mode="json") for signal in risk_result.signals],
            should_enqueue_review=(risk_result.decision == "review" or not allowed),
            next_eligible_at=self._next_eligible_at() if not allowed else None,
            metadata={
                "request_id": payload.request_id,
                "tier": payload.tier,
                "risk_decision": risk_result.decision,
            },
        )

        await self.supabase.insert_risk_event(
            {
                "event_type": "watch_validation",
                "user_id": payload.user_id,
                "ip": payload.ip,
                "request_id": payload.request_id,
                "decision": "allow" if result.allowed else "block",
                "level": result.level,
                "score": result.score,
                "reason": result.reason,
                "signals": result.signals,
                "metadata": {
                    "session_id": result.session_id,
                    "ad_id": result.ad_id,
                    "summary": result.summary.model_dump(mode="json"),
                },
            }
        )

        await self.nestjs.notify_watch_validation_result(
            {
                "userId": result.user_id,
                "adId": result.ad_id,
                "sessionId": result.session_id,
                "allowed": result.allowed,
                "score": result.score,
                "level": result.level,
                "reason": result.reason,
                "summary": result.summary.model_dump(mode="json"),
                "signals": result.signals,
                "metadata": result.metadata,
            }
        )

        return result

    def _summarize(
        self,
        events: list[WatchSessionEvidence],
        *,
        expected_min_duration_seconds: int,
    ) -> WatchValidationSummary:
        ordered = sorted(events, key=lambda item: item.at_second)
        heartbeat_events = [event for event in ordered if event.event_type == "heartbeat"]
        visible_heartbeats = [
            event for event in heartbeat_events if event.visible and event.tab_focused
        ]
        hidden_heartbeats = [
            event for event in heartbeat_events if not (event.visible and event.tab_focused)
        ]
        pauses = [event for event in ordered if event.event_type == "pause"]
        plays = [event for event in ordered if event.event_type == "play"]
        ended_present = any(event.event_type == "ended" for event in ordered)

        max_second = max((event.at_second for event in ordered), default=0.0)
        evidence_duration = round(max_second, 2)
        expected = max(float(expected_min_duration_seconds), 1.0)
        continuity_ratio = min(1.0, round(evidence_duration / expected, 4))

        max_playback_rate = max((event.playback_rate for event in ordered), default=1.0)

        suspicious_flags: list[str] = []
        if len(heartbeat_events) < max(2, expected_min_duration_seconds // 10):
            suspicious_flags.append("low_heartbeat_density")
        if hidden_heartbeats and len(hidden_heartbeats) > len(visible_heartbeats):
            suspicious_flags.append("mostly_hidden_playback")
        if max_playback_rate > 1.5:
            suspicious_flags.append("high_playback_rate")
        if pauses and len(pauses) > len(plays) + 2:
            suspicious_flags.append("excessive_pause_activity")
        if not ended_present and evidence_duration >= expected:
            suspicious_flags.append("missing_explicit_end_event")

        return WatchValidationSummary(
            total_events=len(ordered),
            heartbeat_count=len(heartbeat_events),
            visible_heartbeat_count=len(visible_heartbeats),
            hidden_heartbeat_count=len(hidden_heartbeats),
            play_event_count=len(plays),
            pause_event_count=len(pauses),
            ended_event_present=ended_present,
            continuity_ratio=continuity_ratio,
            evidence_duration_seconds=evidence_duration,
            max_playback_rate=max_playback_rate,
            suspicious_flags=suspicious_flags,
        )

    @staticmethod
    def _next_eligible_at() -> str:
        return (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
