from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.api.dependencies.internal_access import require_internal_access
from app.core.security.request_identity import RequestIdentity
from app.schemas.request_audit_envelope import (
    RequestAuditEnvelopeRequest,
    RequestAuditEnvelopeResponse,
)
from app.services.request_audit_envelope_service import (
    RequestAuditEnvelopeService,
)

router = APIRouter(
    prefix="/request-audit-envelope",
    tags=["request-audit-envelope"],
)


def request_audit_envelope_service_dep() -> RequestAuditEnvelopeService:
    return RequestAuditEnvelopeService()


@router.post("/build", response_model=RequestAuditEnvelopeResponse)
async def build_request_audit_envelope(
    payload: RequestAuditEnvelopeRequest,
    _request: Request,
    identity: RequestIdentity = Depends(require_internal_access),
    service: RequestAuditEnvelopeService = Depends(
        request_audit_envelope_service_dep
    ),
):
    result = service.build(
        route_path=payload.route_path,
        method=payload.method,
        request_identity=identity,
        payload_summary=payload.payload_summary,
        response_summary=payload.response_summary,
        tags=payload.tags,
    )
    return RequestAuditEnvelopeResponse(**result)
