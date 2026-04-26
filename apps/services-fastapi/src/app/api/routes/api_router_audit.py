from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.api_router_audit import ApiRouterAuditResponse
from app.services.api_router_audit_service import ApiRouterAuditService
from app.services.expected_router_registry_service import (
    ExpectedRouterRegistryService,
)
from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)

router = APIRouter(
    prefix="/api-router-audit",
    tags=["api-router-audit"],
)


def api_router_audit_service_dep() -> ApiRouterAuditService:
    return ApiRouterAuditService()


def expected_router_registry_service_dep() -> ExpectedRouterRegistryService:
    return ExpectedRouterRegistryService()


def system_route_registry_service_dep() -> SystemRouteRegistryService:
    return SystemRouteRegistryService()


@router.get("/snapshot", response_model=ApiRouterAuditResponse)
async def get_api_router_audit_snapshot(
    audit_service: ApiRouterAuditService = Depends(api_router_audit_service_dep),
    expected_service: ExpectedRouterRegistryService = Depends(
        expected_router_registry_service_dep
    ),
    registry_service: SystemRouteRegistryService = Depends(
        system_route_registry_service_dep
    ),
):
    expected = expected_service.build()["expected_router_registry"][
        "expected_router_prefixes"
    ]

    route_registry = registry_service.build()["route_registry"]
    mounted = sorted(
        str(prefix).strip()
        for prefix in route_registry.get("groups", {}).keys()
    )

    # mounted router prefixes are semantic groups, not real URL prefixes.
    # convert to canonical URL prefixes from group entries to perform the actual audit.
    mounted_prefixes: set[str] = set()
    for entries in route_registry.get("groups", {}).values():
        for entry in entries:
            path = str(entry.get("path") or "").strip()
            if not path.startswith("/"):
                continue
            first_segment = "/" + path.strip("/").split("/")[0]
            mounted_prefixes.add(first_segment)

    result = audit_service.build(
        mounted_router_prefixes=sorted(mounted_prefixes),
        expected_router_prefixes=expected,
    )
    return ApiRouterAuditResponse(**result)
