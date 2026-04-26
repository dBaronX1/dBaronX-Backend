from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.internal_route_protection_audit import (
    InternalRouteProtectionAuditResponse,
)
from app.services.internal_route_protection_audit_service import (
    InternalRouteProtectionAuditService,
)

router = APIRouter(
    prefix="/internal-route-protection-audit",
    tags=["internal-route-protection-audit"],
)


def internal_route_protection_audit_service_dep() -> (
    InternalRouteProtectionAuditService
):
    return InternalRouteProtectionAuditService()


@router.get("/snapshot", response_model=InternalRouteProtectionAuditResponse)
async def get_internal_route_protection_audit_snapshot(
    service: InternalRouteProtectionAuditService = Depends(
        internal_route_protection_audit_service_dep
    ),
):
    result = service.build()
    return InternalRouteProtectionAuditResponse(**result)
