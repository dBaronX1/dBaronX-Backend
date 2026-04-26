from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import ORJSONResponse

from app.core.deps import require_internal_token
from app.schemas.common import SuccessEnvelope
from app.schemas.risk import (
    AdWatchRiskRequest,
    AffiliateRiskRequest,
    AiGenerationRiskRequest,
    CheckoutRiskRequest,
    PayoutRiskRequest,
    RiskAssessmentRequest,
)
from app.services.redis_service import RedisService
from app.services.risk_engine import RiskEngine
from app.services.supabase_service import SupabaseService
from app.services.trust_signal_service import TrustSignalService

router = APIRouter(prefix="/risk", tags=["risk"])


def build_engine() -> RiskEngine:
    redis = RedisService()
    supabase = SupabaseService()
    trust = TrustSignalService(supabase)
    return RiskEngine(redis=redis, supabase=supabase, trust_signals=trust)


@router.post("/checkout")
async def score_checkout(
    payload: CheckoutRiskRequest,
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    engine = build_engine()
    result = await engine.assess(payload)
    envelope = SuccessEnvelope(
        message="Checkout risk assessment completed",
        data=result,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))


@router.post("/affiliate")
async def score_affiliate(
    payload: AffiliateRiskRequest,
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    engine = build_engine()
    result = await engine.assess(payload)
    envelope = SuccessEnvelope(
        message="Affiliate risk assessment completed",
        data=result,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))


@router.post("/ad-watch")
async def score_ad_watch(
    payload: AdWatchRiskRequest,
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    engine = build_engine()
    result = await engine.assess(payload)
    envelope = SuccessEnvelope(
        message="Ad watch risk assessment completed",
        data=result,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))


@router.post("/payout")
async def score_payout(
    payload: PayoutRiskRequest,
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    engine = build_engine()
    result = await engine.assess(payload)
    envelope = SuccessEnvelope(
        message="Payout risk assessment completed",
        data=result,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))


@router.post("/ai-generation")
async def score_ai_generation(
    payload: AiGenerationRiskRequest,
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    engine = build_engine()
    result = await engine.assess(payload)
    envelope = SuccessEnvelope(
        message="AI generation risk assessment completed",
        data=result,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))


@router.post("/generic")
async def generic_risk_assessment(
    payload: RiskAssessmentRequest,
    request: Request,
    _token: str = Depends(require_internal_token),
) -> ORJSONResponse:
    engine = build_engine()
    result = await engine.assess(payload)
    envelope = SuccessEnvelope(
        message="Generic risk assessment completed",
        data=result,
        request_id=getattr(request.state, "request_id", None),
    )
    return ORJSONResponse(content=envelope.model_dump(mode="json"))
