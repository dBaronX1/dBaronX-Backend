from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.dependency_wiring_audit import (
    DependencyWiringAuditResponse,
)
from app.services.dependency_wiring_audit_service import (
    DependencyWiringAuditService,
)

router = APIRouter(
    prefix="/dependency-wiring-audit",
    tags=["dependency-wiring-audit"],
)


def dependency_wiring_audit_service_dep() -> DependencyWiringAuditService:
    return DependencyWiringAuditService()


@router.get("/snapshot", response_model=DependencyWiringAuditResponse)
async def get_dependency_wiring_audit_snapshot(
    service: DependencyWiringAuditService = Depends(
        dependency_wiring_audit_service_dep
    ),
):
    result = service.build()
    return DependencyWiringAuditResponse(**result)
