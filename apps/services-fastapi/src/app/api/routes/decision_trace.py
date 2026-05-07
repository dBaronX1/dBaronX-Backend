from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.internal_access import require_internal_access
from app.schemas.decision_trace import (
    DecisionTraceRequest,
    DecisionTraceResponse,
)
from app.services.decision_trace_service import DecisionTraceService

router = APIRouter(
    dependencies=[Depends(require_internal_access)],
    prefix="/decision-trace",
    tags=["decision-trace"],
)


def decision_trace_service_dep() -> DecisionTraceService:
    return DecisionTraceService()


@router.post("/build", response_model=DecisionTraceResponse)
async def build_decision_trace(
    payload: DecisionTraceRequest,
    service: DecisionTraceService = Depends(decision_trace_service_dep),
):
    result = service.build(
        flow_type=payload.flow_type,
        decision_payload=payload.decision_payload,
        request_payload=payload.request_payload,
        metadata=payload.metadata,
    )
    return DecisionTraceResponse(**result)
