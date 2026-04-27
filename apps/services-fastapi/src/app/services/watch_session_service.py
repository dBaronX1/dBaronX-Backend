from __future__ import annotations

import time
from typing import Any

from app.schemas.watch_session import (
    WatchHeartbeatRequest,
    WatchSessionFinalizeRequest,
    WatchSessionResult,
    WatchSessionStartRequest,
    WatchSessionState,
)
from app.services.redis_service import RedisService


class WatchSessionService:
    """
    Canonical Watch Session Engine:
    - stateful session tracking (Redis)
    - heartbeat aggregation
    - anti-fraud heuristics
    - idempotent finalization
    """

    def __init__(self, *, redis: RedisService) -> None:
        self.redis = redis
        self.ttl_seconds = 60 * 60  # 1 hour

    def _key(self, session_id: str) -> str:
        return f"watch:session:{session_id}"

    async def start(self, payload: WatchSessionStartRequest) -> WatchSessionState:
        now = int(time.time())

        session_id = payload.session_id or f"w2e_{now}_{payload.ad_id}"

        state = WatchSessionState(
            session_id=session_id,
            ad_id=payload.ad_id,
            user_id=payload.user_id,
            started_at=now,
            last_event_at=now,
            metadata=payload.metadata,
        )

        await self.redis.set_json(self._key(session_id), state.model_dump(), self.ttl_seconds)
        return state

    async def heartbeat(self, payload: WatchHeartbeatRequest) -> WatchSessionState:
        key = self._key(payload.session_id)
        state_data = await self.redis.get_json(key)

        if not state_data:
            raise ValueError("session_not_found")

        state = WatchSessionState(**state_data)

        now = int(time.time())

        for event in payload.events:
            state.total_duration += 1
            if event.visible:
                state.visible_duration += 1
                state.visible_events += 1
            else:
                state.hidden_events += 1

            if event.playback_rate and event.playback_rate > state.playback_rate_max:
                state.playback_rate_max = event.playback_rate

        state.last_event_at = now

        await self.redis.set_json(key, state.model_dump(), self.ttl_seconds)
        return state

    async def finalize(self, payload: WatchSessionFinalizeRequest) -> WatchSessionResult:
        key = self._key(payload.session_id)
        state_data = await self.redis.get_json(key)

        if not state_data:
            raise ValueError("session_not_found")

        state = WatchSessionState(**state_data)

        if state.finalized:
            return self._result(state, "already_finalized")

        state.captcha_verified = payload.captcha_verified
        state.finalized = True

        flags: list[str] = []

        if state.visible_duration < 10:
            flags.append("low_visible_time")

        if state.playback_rate_max > 2.0:
            flags.append("speed_abuse")

        if state.hidden_events > state.visible_events:
            flags.append("background_play")

        if not state.captcha_verified:
            flags.append("captcha_missing")

        state.fraud_flags = flags

        await self.redis.set_json(key, state.model_dump(), self.ttl_seconds)

        return self._result(state, "completed")

    def _result(self, state: WatchSessionState, reason: str) -> WatchSessionResult:
        risk_score = min(1.0, len(state.fraud_flags) * 0.25)
        risk_level = "low" if risk_score < 0.3 else "medium" if risk_score < 0.7 else "high"

        eligible = (
            state.visible_duration >= 20
            and state.captcha_verified
            and risk_score < 0.7
        )

        return WatchSessionResult(
            success=True,
            session_id=state.session_id,
            reward_eligible=eligible,
            reason=reason,
            duration_seconds=state.total_duration,
            visible_seconds=state.visible_duration,
            risk_score=risk_score,
            risk_level=risk_level,
        )
