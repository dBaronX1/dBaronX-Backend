from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.fraud_decision import FraudDecisionRequest, FraudDecisionResponse
from app.services.fraud_decision_service import FraudDecisionService

router = APIRouter(prefix="/fraud-decision", tags=["fraud-decision"])


def fraud_decision_service_dep() -> FraudDecisionService:
    return FraudDecisionService()


@router.post("/decide", response_model=FraudDecisionResponse)
async def decide_fraud_risk(
    payload: FraudDecisionRequest,
    service: FraudDecisionService = Depends(fraud_decision_service_dep),
):
    result = service.decide(
        flow_type=payload.flow_type,
        account_id=payload.account_id,
        ip=payload.ip,
        headers=payload.headers,
        session_payload=payload.session_payload,
        affiliate_payload=payload.affiliate_payload,
        payment_payload=payload.payment_payload,
        account_profile=payload.account_profile,
    )
    return FraudDecisionResponse(**result)
