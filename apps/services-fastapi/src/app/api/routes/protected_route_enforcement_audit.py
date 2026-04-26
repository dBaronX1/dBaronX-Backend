from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.protected_route_enforcement_audit import (
    ProtectedRouteEnforcementAuditResponse,
)
from app.services.protected_route_enforcement_audit_service import (
    ProtectedRouteEnforcementAuditService,
)

router = APIRouter(
    prefix="/protected-route-enforcement-audit",
    tags=["protected-route-enforcement-audit"],
)


def protected_route_enforcement_audit_service_dep() -> (
    ProtectedRouteEnforcementAuditService
):
    return ProtectedRouteEnforcementAuditService()


@router.get("/snapshot", response_model=ProtectedRouteEnforcementAuditResponse)
async def get_protected_route_enforcement_audit_snapshot(
    service: ProtectedRouteEnforcementAuditService = Depends(
        protected_route_enforcement_audit_service_dep
    ),
):
    result = service.build()
    return ProtectedRouteEnforcementAuditResponse(**result)
