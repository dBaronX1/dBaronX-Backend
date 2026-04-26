from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.payment_telemetry import (
    PaymentTelemetryRequest,
    PaymentTelemetryResponse,
)
from app.services.payment_telemetry_service import PaymentTelemetryService

router = APIRouter(prefix="/payment-telemetry", tags=["payment-telemetry"])


def payment_telemetry_service_dep() -> PaymentTelemetryService:
    return PaymentTelemetryService()


@router.post("/evaluate", response_model=PaymentTelemetryResponse)
async def evaluate_payment_telemetry(
    payload: PaymentTelemetryRequest,
    service: PaymentTelemetryService = Depends(
        payment_telemetry_service_dep
    ),
):
    result = service.evaluate(
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
    )
    return PaymentTelemetryResponse(**result)
