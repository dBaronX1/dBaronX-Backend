from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.internal_auth_middleware_audit import (
    InternalAuthMiddlewareAuditResponse,
)
from app.services.internal_auth_middleware_audit_service import (
    InternalAuthMiddlewareAuditService,
)

router = APIRouter(
    prefix="/internal-auth-middleware-audit",
    tags=["internal-auth-middleware-audit"],
)


def internal_auth_middleware_audit_service_dep() -> (
    InternalAuthMiddlewareAuditService
):
    return InternalAuthMiddlewareAuditService()


@router.get("/snapshot", response_model=InternalAuthMiddlewareAuditResponse)
async def get_internal_auth_middleware_audit_snapshot(
    service: InternalAuthMiddlewareAuditService = Depends(
        internal_auth_middleware_audit_service_dep
    ),
):
    result = service.build()
    return InternalAuthMiddlewareAuditResponse(**result)
