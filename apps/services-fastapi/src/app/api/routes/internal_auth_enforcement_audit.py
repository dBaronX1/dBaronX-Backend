from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.internal_auth_enforcement_audit import (
    InternalAuthEnforcementAuditResponse,
)
from app.services.internal_auth_enforcement_audit_service import (
    InternalAuthEnforcementAuditService,
)

router = APIRouter(
    prefix="/internal-auth-enforcement-audit",
    tags=["internal-auth-enforcement-audit"],
)


def internal_auth_enforcement_audit_service_dep() -> (
    InternalAuthEnforcementAuditService
):
    return InternalAuthEnforcementAuditService()


@router.get("/snapshot", response_model=InternalAuthEnforcementAuditResponse)
async def get_internal_auth_enforcement_audit_snapshot(
    service: InternalAuthEnforcementAuditService = Depends(
        internal_auth_enforcement_audit_service_dep
    ),
):
    result = service.build()
    return InternalAuthEnforcementAuditResponse(**result)
