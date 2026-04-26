from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.payment_preflight_decision import (
    PaymentPreflightDecisionRequest,
    PaymentPreflightDecisionResponse,
)
from app.services.payment_preflight_decision_service import (
    PaymentPreflightDecisionService,
)

router = APIRouter(
    prefix="/payment-preflight-decision",
    tags=["payment-preflight-decision"],
)


def payment_preflight_decision_service_dep() -> PaymentPreflightDecisionService:
    return PaymentPreflightDecisionService()


@router.post("/decide", response_model=PaymentPreflightDecisionResponse)
async def decide_payment_preflight(
    payload: PaymentPreflightDecisionRequest,
    service: PaymentPreflightDecisionService = Depends(
        payment_preflight_decision_service_dep
    ),
):
    result = service.decide(
        order_id=payload.order_id,
        account_id=payload.account_id,
        ip=payload.ip,
        headers=payload.headers,
        amount=payload.amount,
        currency=payload.currency,
        failed_payments_24h=payload.failed_payments_24h,
        attempts_last_1h=payload.attempts_last_1h,
        distinct_cards_last_24h=payload.distinct_cards_last_24h,
        distinct_accounts_from_ip_24h=payload.distinct_accounts_from_ip_24h,
        recent_ip_events=payload.recent_ip_events,
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
    return PaymentPreflightDecisionResponse(**result)
