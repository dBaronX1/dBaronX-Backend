from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.w2e_reward_decision import (
    W2ERewardDecisionRequest,
    W2ERewardDecisionResponse,
)
from app.services.w2e_reward_decision_service import W2ERewardDecisionService

router = APIRouter(prefix="/w2e-reward-decision", tags=["w2e-reward-decision"])


def w2e_reward_decision_service_dep() -> W2ERewardDecisionService:
    return W2ERewardDecisionService()


@router.post("/decide", response_model=W2ERewardDecisionResponse)
async def decide_w2e_reward(
    payload: W2ERewardDecisionRequest,
    service: W2ERewardDecisionService = Depends(
        w2e_reward_decision_service_dep
    ),
):
    result = service.decide(
        session_id=payload.session_id,
        account_id=payload.account_id,
        headers=payload.headers,
        ip=payload.ip,
        declared_duration_seconds=payload.declared_duration_seconds,
        heartbeat_intervals_ms=payload.heartbeat_intervals_ms,
        total_heartbeats=payload.total_heartbeats,
        hidden_event_count=payload.hidden_event_count,
        blur_event_count=payload.blur_event_count,
        seek_event_count=payload.seek_event_count,
        playback_rate_max=payload.playback_rate_max,
        muted_ratio=payload.muted_ratio,
        duplicate_claim_attempts=payload.duplicate_claim_attempts,
        recent_ip_events=payload.recent_ip_events,
        distinct_accounts_24h=payload.distinct_accounts_24h,
        failed_captcha_1h=payload.failed_captcha_1h,
        denied_watch_claims_24h=payload.denied_watch_claims_24h,
        account_age_days=payload.account_age_days,
        email_verified=payload.email_verified,
        phone_verified=payload.phone_verified,
        completed_orders=payload.completed_orders,
        successful_watches_30d=payload.successful_watches_30d,
        denied_watches_30d=payload.denied_watches_30d,
        affiliate_payout_rejections_180d=payload.affiliate_payout_rejections_180d,
        chargebacks_365d=payload.chargebacks_365d,
        policy_flags_180d=payload.policy_flags_180d,
        device_count_30d=payload.device_count_30d,
    )
    return W2ERewardDecisionResponse(**result)
