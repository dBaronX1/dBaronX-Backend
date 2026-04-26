from __future__ import annotations

from app.schemas.risk import CheckoutRiskRequest, RiskDecisionResponse
from app.services.idempotency_service import IdempotencyService
from app.services.rate_limit_service import RateLimitService
from app.services.risk_scoring_service import RiskScoringService
from app.services.risk_signal_service import RiskSignalService
from app.services.supabase_service import SupabaseService


class CheckoutRiskService:
    """
    Canonical checkout risk service used by NestJS through FastAPI.
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

    async def evaluate(self, request: CheckoutRiskRequest) -> RiskDecisionResponse:
        async def _compute() -> dict:
            identifier = request.user_id or request.email or request.ip or "unknown"
            rate = await self.rate_limit.check(
                namespace="checkout-risk",
                identifier=identifier,
                limit=20,
                window_seconds=300,
            )

            email_domain = request.email.split("@")[-1].lower()
            risky_domains = {"mailinator.com", "tempmail.com", "10minutemail.com"}

            breakdown = self.scoring.score_checkout(
                amount=request.amount,
                suspicious_user_agent=self.signal_service.suspicious_user_agent(request.user_agent),
                velocity_exceeded=not rate.allowed,
                duplicate_ip_cluster=False,
                email_domain_risky=email_domain in risky_domains,
                guest_checkout=bool(request.guest_reference and not request.user_id),
            )

            allowed = breakdown.score < 0.8

            event = {
                "event_type": "checkout_risk",
                "decision": "allow" if allowed else "block",
                "score": breakdown.score,
                "level": breakdown.level,
                "reason": breakdown.reason,
                "user_id": request.user_id,
                "metadata": {
                    "ip": request.ip,
                    "email": request.email,
                    "payment_method": request.payment_method,
                    "currency": request.currency,
                    "amount": request.amount,
                    "signals": breakdown.signals,
                },
            }
            await self.supabase.insert_risk_event(event)

            return {
                "allowed": allowed,
                "score": breakdown.score,
                "level": breakdown.level,
                "reason": breakdown.reason,
                "signals": breakdown.signals,
            }

        idem = await self.idempotency.execute(
            namespace="checkout-risk",
            payload=request.model_dump(mode="json"),
            ttl_seconds=60 * 15,
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
