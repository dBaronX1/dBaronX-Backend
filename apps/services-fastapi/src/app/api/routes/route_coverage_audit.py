from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.route_coverage_audit import RouteCoverageAuditResponse
from app.services.route_coverage_audit_service import RouteCoverageAuditService

router = APIRouter(
    prefix="/route-coverage-audit",
    tags=["route-coverage-audit"],
)


def route_coverage_audit_service_dep() -> RouteCoverageAuditService:
    return RouteCoverageAuditService()


@router.get("/snapshot", response_model=RouteCoverageAuditResponse)
async def get_route_coverage_audit_snapshot(
    service: RouteCoverageAuditService = Depends(
        route_coverage_audit_service_dep
    ),
):
    result = service.build()
    return RouteCoverageAuditResponse(**result)
