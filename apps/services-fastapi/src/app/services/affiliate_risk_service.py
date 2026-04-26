from __future__ import annotations

from app.schemas.risk import AffiliateRiskRequest, RiskDecisionResponse
from app.services.idempotency_service import IdempotencyService
from app.services.rate_limit_service import RateLimitService
from app.services.risk_scoring_service import RiskScoringService
from app.services.risk_signal_service import RiskSignalService
from app.services.supabase_service import SupabaseService


class AffiliateRiskService:
    """
    Canonical affiliate abuse/risk evaluation service.
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

    async def evaluate(self, request: AffiliateRiskRequest) -> RiskDecisionResponse:
        async def _compute() -> dict:
            identifier = request.user_id or request.referral_code or request.ip or "unknown"
            rate = await self.rate_limit.check(
                namespace="affiliate-risk",
                identifier=identifier,
                limit=40,
                window_seconds=300,
            )

            breakdown = self.scoring.score_affiliate(
                suspicious_user_agent=self.signal_service.suspicious_user_agent(request.user_agent),
                velocity_exceeded=not rate.allowed,
                duplicate_ip_cluster=False,
                referral_code_present=bool(request.referral_code),
                amount=request.amount,
            )

            allowed = breakdown.score < 0.82

            await self.supabase.insert_risk_event(
                {
                    "event_type": "affiliate_risk",
                    "decision": "allow" if allowed else "block",
                    "score": breakdown.score,
                    "level": breakdown.level,
                    "reason": breakdown.reason,
                    "user_id": request.user_id,
                    "metadata": {
                        "ip": request.ip,
                        "event_type": request.event_type,
                        "ad_id": request.ad_id,
                        "referral_code": request.referral_code,
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
            namespace="affiliate-risk",
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
