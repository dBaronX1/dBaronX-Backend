from __future__ import annotations

from typing import Any

from app.services.api_router_audit_service import ApiRouterAuditService
from app.services.expected_router_registry_service import (
    ExpectedRouterRegistryService,
)
from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)


class RouterInclusionClosureService:
    """
    Canonical closure service for API router inclusion.

    This makes Step 1 explicit: router inclusion is not considered closed
    until the mounted prefixes match the canonical expected registry.
    """

    def __init__(
        self,
        *,
        api_router_audit_service: ApiRouterAuditService | None = None,
        expected_router_registry_service: ExpectedRouterRegistryService | None = None,
        system_route_registry_service: SystemRouteRegistryService | None = None,
    ) -> None:
        self.api_router_audit_service = api_router_audit_service or ApiRouterAuditService()
        self.expected_router_registry_service = (
            expected_router_registry_service or ExpectedRouterRegistryService()
        )
        self.system_route_registry_service = (
            system_route_registry_service or SystemRouteRegistryService()
        )

    def build(self) -> dict[str, Any]:
        expected = self.expected_router_registry_service.build()[
            "expected_router_registry"
        ]["expected_router_prefixes"]
        route_registry = self.system_route_registry_service.build()["route_registry"]

        mounted_prefixes: set[str] = set()
        for entries in route_registry.get("groups", {}).values():
            for entry in entries:
                path = str(entry.get("path") or "").strip()
                if not path.startswith("/"):
                    continue
                mounted_prefixes.add("/" + path.strip("/").split("/")[0])

        audit = self.api_router_audit_service.build(
            mounted_router_prefixes=sorted(mounted_prefixes),
            expected_router_prefixes=expected,
        )["api_router_audit"]

        return {
            "success": True,
            "router_inclusion_closure": {
                "closed": audit["complete"],
                "missing_router_prefixes": audit["missing_router_prefixes"],
                "unexpected_router_prefixes": audit["unexpected_router_prefixes"],
                "mounted_count": audit["mounted_count"],
                "expected_count": audit["expected_count"],
            },
        }
