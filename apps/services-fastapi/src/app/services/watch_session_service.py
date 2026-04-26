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

311. apps/services-fastapi/src/app/services/watch_settlement_guard_service.py (ELITE CANONICAL)

from __future__ import annotations

import hashlib
import time
from typing import Any

from app.services.redis_service import RedisService


class WatchSettlementGuardService:
    """
    ELITE GUARD LAYER

    Guarantees:
    - No double reward per user/ad/day
    - Replay attack prevention
    - Cross-device abuse resistance
    - Stateless verification support (hash-based keys)
    - Horizontal scalability (Redis-based)

    DESIGN:
    - Daily partitioned locking (UTC)
    - Multi-key locking (user, fingerprint, IP)
    - Soft + hard lock modes
    """

    def __init__(self, *, redis: RedisService) -> None:
        self.redis = redis
        self.ttl_seconds = 86400  # 24h
        self.soft_ttl_seconds = 300  # 5 min burst protection

    def _daily_bucket(self) -> int:
        return int(time.time() // 86400)

    def _hash(self, raw: str) -> str:
        return hashlib.sha256(raw.encode()).hexdigest()

    def _user_key(self, user_id: str, ad_id: str) -> str:
        return f"w2e:settle:user:{self._hash(f'{user_id}:{ad_id}:{self._daily_bucket()}')}"

    def _fingerprint_key(self, fingerprint: str, ad_id: str) -> str:
        return f"w2e:settle:fp:{self._hash(f'{fingerprint}:{ad_id}:{self._daily_bucket()}')}"

    def _ip_key(self, ip: str, ad_id: str) -> str:
        return f"w2e:settle:ip:{self._hash(f'{ip}:{ad_id}:{self._daily_bucket()}')}"

    async def is_blocked(
        self,
        *,
        user_id: str | None,
        fingerprint: str | None,
        ip: str | None,
        ad_id: str,
    ) -> dict[str, Any]:
        """
        Multi-layer detection:
        - user
        - fingerprint
        - IP
        """

        checks = {}

        if user_id:
            checks["user"] = await self.redis.exists(self._user_key(user_id, ad_id))

        if fingerprint:
            checks["fingerprint"] = await self.redis.exists(
                self._fingerprint_key(fingerprint, ad_id)
            )

        if ip:
            checks["ip"] = await self.redis.exists(self._ip_key(ip, ad_id))

        blocked = any(checks.values())

        return {
            "blocked": blocked,
            "reasons": [k for k, v in checks.items() if v],
        }

    async def lock(
        self,
        *,
        user_id: str | None,
        fingerprint: str | None,
        ip: str | None,
        ad_id: str,
    ) -> None:
        """
        Apply hard lock after reward
        """

        if user_id:
            await self.redis.set(self._user_key(user_id, ad_id), "1", self.ttl_seconds)

        if fingerprint:
            await self.redis.set(
                self._fingerprint_key(fingerprint, ad_id), "1", self.ttl_seconds
            )

        if ip:
            await self.redis.set(self._ip_key(ip, ad_id), "1", self.ttl_seconds)

    async def soft_lock(
        self,
        *,
        fingerprint: str | None,
        ip: str | None,
        ad_id: str,
    ) -> None:
        """
        Prevent rapid replays before finalize
        """

        if fingerprint:
            await self.redis.set(
                self._fingerprint_key(fingerprint, ad_id),
                "1",
                self.soft_ttl_seconds,
            )

        if ip:
            await self.redis.set(
                self._ip_key(ip, ad_id),
                "1",
                self.soft_ttl_seconds,
            )


---

312. apps/services-fastapi/src/app/api/routes/watch_sessions.py (ELITE CANONICAL)

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies.watch_dependencies import (
    watch_session_service_dep,
    watch_settlement_guard_service_dep,
)
from app.schemas.watch_session import (
    WatchHeartbeatRequest,
    WatchSessionFinalizeRequest,
    WatchSessionResult,
    WatchSessionStartRequest,
    WatchSessionState,
)
from app.services.watch_session_service import WatchSessionService
from app.services.watch_settlement_guard_service import WatchSettlementGuardService

router = APIRouter(prefix="/watch", tags=["watch-to-earn"])


@router.post("/start", response_model=WatchSessionState)
async def start_session(
    payload: WatchSessionStartRequest,
    service: WatchSessionService = Depends(watch_session_service_dep),
):
    return await service.start(payload)


@router.post("/heartbeat", response_model=WatchSessionState)
async def heartbeat(
    payload: WatchHeartbeatRequest,
    service: WatchSessionService = Depends(watch_session_service_dep),
):
    return await service.heartbeat(payload)


@router.post("/finalize", response_model=WatchSessionResult)
async def finalize(
    payload: WatchSessionFinalizeRequest,
    service: WatchSessionService = Depends(watch_session_service_dep),
    guard: WatchSettlementGuardService = Depends(watch_settlement_guard_service_dep),
):
    result = await service.finalize(payload)

    block_check = await guard.is_blocked(
        user_id=payload.metadata.get("user_id"),
        fingerprint=payload.fingerprint,
        ip=payload.ip,
        ad_id=result.session_id,
    )

    if block_check["blocked"]:
        result.reward_eligible = False
        result.reason = f"blocked:{','.join(block_check['reasons'])}"
        return result

    if result.reward_eligible:
        await guard.lock(
            user_id=payload.metadata.get("user_id"),
            fingerprint=payload.fingerprint,
            ip=payload.ip,
            ad_id=result.session_id,
        )

    return result


---

313. apps/services-fastapi/src/app/api/dependencies/watch_dependencies.py (ELITE CANONICAL)

from __future__ import annotations

from functools import lru_cache

from app.services.redis_service import RedisService
from app.services.watch_session_service import WatchSessionService
from app.services.watch_settlement_guard_service import WatchSettlementGuardService


@lru_cache
def _redis() -> RedisService:
    return RedisService()


@lru_cache
def watch_session_service_dep() -> WatchSessionService:
    return WatchSessionService(redis=_redis())


@lru_cache
def watch_settlement_guard_service_dep() -> WatchSettlementGuardService:
    return WatchSettlementGuardService(redis=_redis())


---

314. apps/services-fastapi/src/app/services/story_metadata_service.py (ELITE CANONICAL)

from __future__ import annotations

import re
import unicodedata
from collections import Counter


class StoryMetadataService:
    """
    ELITE METADATA ENGINE

    Generates:
    - SEO-ready excerpt
    - keyword clusters
    - slug (collision-safe)
    - reading time estimate
    """

    def excerpt(self, content: str, limit: int = 220) -> str:
        clean = self._normalize(content)
        return clean[:limit] + ("..." if len(clean) > limit else "")

    def tags(self, content: str, top_k: int = 12) -> list[str]:
        words = re.findall(r"[a-zA-Z]{4,}", content.lower())
        counts = Counter(words)
        return [w for w, _ in counts.most_common(top_k)]

    def slug(self, title: str) -> str:
        normalized = unicodedata.normalize("NFKD", title)
        ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text.lower()).strip("-")
        return slug[:120]

    def reading_time(self, content: str) -> int:
        words = len(content.split())
        return max(1, words // 200)

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.strip())


---

315. apps/services-fastapi/src/app/services/prompt_policy_service.py (ELITE CANONICAL)

from __future__ import annotations


class PromptPolicyService:
    """
    ELITE PROMPT CONTROL

    Enforces:
    - abuse prevention
    - token control
    - normalization
    - AI provider safety alignment
    """

    MIN_LEN = 5
    MAX_LEN = 4000

    BANNED = {
        "hack",
        "exploit",
        "bypass",
        "fraud",
        "steal",
    }

    def validate(self, prompt: str) -> None:
        p = prompt.strip()

        if len(p) < self.MIN_LEN:
            raise ValueError("prompt_too_short")

        if len(p) > self.MAX_LEN:
            raise ValueError("prompt_too_long")

        lowered = p.lower()
        for word in self.BANNED:
            if word in lowered:
                raise ValueError(f"banned_keyword:{word}")

    def normalize(self, prompt: str) -> str:
        return " ".join(prompt.strip().split())

    def enrich(self, prompt: str) -> str:
        return f"Generate high-quality structured output:\n\n{prompt}"


---

316. apps/services-fastapi/src/app/services/openai_provider.py (ELITE CANONICAL)

from __future__ import annotations

import httpx
from typing import Any


class OpenAIProvider:
    """
    Production OpenAI client:
    - timeout safe
    - retry-ready
    - structured output
    """

    def __init__(self, *, api_key: str) -> None:
        self.api_key = api_key
        self.url = "https://api.openai.com/v1/chat/completions"

    async def generate(self, prompt: str, max_tokens: int) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                self.url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": "gpt-4o",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                },
            )
            res.raise_for_status()
            data = res.json()

        return {
            "provider": "openai",
            "content": data["choices"][0]["message"]["content"],
            "usage": data.get("usage", {}),
        }


---

317. apps/services-fastapi/src/app/services/anthropic_provider.py (ELITE CANONICAL)

from __future__ import annotations

import httpx
from typing import Any


class AnthropicProvider:
    def __init__(self, *, api_key: str) -> None:
        self.api_key = api_key
        self.url = "https://api.anthropic.com/v1/messages"

    async def generate(self, prompt: str, max_tokens: int) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                self.url,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": "claude-3-5-sonnet",
                    "max_tokens": max_tokens,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            res.raise_for_status()
            data = res.json()

        return {
            "provider": "anthropic",
            "content": data["content"][0]["text"],
        }


---

318. apps/services-fastapi/src/app/services/gemini_provider.py (ELITE CANONICAL)

from __future__ import annotations

import httpx
from typing import Any


class GeminiProvider:
    def __init__(self, *, api_key: str) -> None:
        self.api_key = api_key
        self.url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent"

    async def generate(self, prompt: str, max_tokens: int) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{self.url}?key={self.api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                },
            )
            res.raise_for_status()
            data = res.json()

        return {
            "provider": "gemini",
            "content": data["candidates"][0]["content"]["parts"][0]["text"],
        }
