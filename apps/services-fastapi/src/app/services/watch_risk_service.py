from __future__ import annotations

from app.schemas.risk import RiskDecisionResponse, WatchRiskRequest
from app.services.idempotency_service import IdempotencyService
from app.services.rate_limit_service import RateLimitService
from app.services.risk_scoring_service import RiskScoringService
from app.services.risk_signal_service import RiskSignalService
from app.services.supabase_service import SupabaseService


class WatchRiskService:
    """
    Canonical watch-to-earn telemetry/risk evaluation service.

    This is the subsystem contract that later telemetry routes, session routes,
    and NestJS watch flows should converge on.
    """

    def __init__(
        self,
        *,
        idempotency: IdempotencyService,
        rate_limit: RateLimitService,
        signal_service: RiskSignalService,
        scoring: RiskScoringService,
        supabase: SupabaseService,
    ) -> None:
        self.idempotency = idempotency
        self.rate_limit = rate_limit
        self.signal_service = signal_service
        self.scoring = scoring
        self.supabase = supabase

    async def evaluate(self, request: WatchRiskRequest) -> RiskDecisionResponse:
        async def _compute() -> dict:
            identifier = (
                request.user_id
                or request.fingerprint
                or request.session_id
                or request.ip
                or "unknown"
            )

            rate = await self.rate_limit.check(
                namespace="watch-risk",
                identifier=identifier,
                limit=60,
                window_seconds=300,
            )

            breakdown = self.scoring.score_watch(
                suspicious_user_agent=self.signal_service.suspicious_user_agent(request.user_agent),
                velocity_exceeded=not rate.allowed,
                duplicate_ip_cluster=False,
                insufficient_visible_heartbeats=self.signal_service.insufficient_visible_heartbeats(
                    visible_heartbeat_count=request.visible_heartbeat_count,
                    duration_seconds=request.duration_seconds,
                ),
                hidden_heartbeat_dominance=self.signal_service.hidden_heartbeat_dominance(
                    visible_heartbeat_count=request.visible_heartbeat_count,
                    hidden_heartbeat_count=request.hidden_heartbeat_count,
                ),
                high_playback_rate=self.signal_service.high_playback_rate(
                    request.playback_rate_max
                ),
                repeated_fingerprint=self.signal_service.repeated_fingerprint(
                    fingerprint_count=1 if request.fingerprint else 0
                ),
                captcha_verified=request.captcha_verified,
                duration_seconds=request.duration_seconds,
                minimum_required_seconds=request.minimum_required_seconds,
            )

            allowed = breakdown.score < 0.78

            await self.supabase.insert_risk_event(
                {
                    "event_type": "watch_risk",
                    "decision": "allow" if allowed else "block",
                    "score": breakdown.score,
                    "level": breakdown.level,
                    "reason": breakdown.reason,
                    "user_id": request.user_id,
                    "metadata": {
                        "ip": request.ip,
                        "ad_id": request.ad_id,
                        "session_id": request.session_id,
                        "fingerprint": request.fingerprint,
                        "signals": breakdown.signals,
                    },
                }
            )

            return {
                "allowed": allowed,
                "score": breakdown.score,
                "level": breakdown.level,
                "reason": breakdown.reason,
                "signals": breakdown.signals,
            }

        idem = await self.idempotency.execute(
            namespace="watch-risk",
            payload=request.model_dump(mode="json"),
            ttl_seconds=60 * 10,
            compute=_compute,
        )
        result = idem["result"]

        return RiskDecisionResponse(
            allowed=bool(result["allowed"]),
            score=float(result["score"]),
            level=str(result["level"]),
            reason=str(result["reason"]),
            signals=dict(result["signals"]),
        )
