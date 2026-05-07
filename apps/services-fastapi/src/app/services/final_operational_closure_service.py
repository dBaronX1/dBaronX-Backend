from __future__ import annotations

from typing import Any

from app.services.api_router_audit_service import ApiRouterAuditService
from app.services.deployment_checklist_service import DeploymentChecklistService
from app.services.expected_router_registry_service import (
    ExpectedRouterRegistryService,
)
from app.services.internal_route_protection_audit_service import (
    InternalRouteProtectionAuditService,
)
from app.services.launch_operation_manifest_service import (
    LaunchOperationManifestService,
)
from app.services.router_registry_runtime_service import RouterRegistryRuntimeService


class FinalOperationalClosureService:
    """
    Canonical FastAPI operational closure surface.

    This is the high-value closure layer for Step 1:
    - router inclusion closure
    - launch/deploy closure
    - route protection closure
    """

    def __init__(
        self,
        *,
        api_router_audit_service: ApiRouterAuditService | None = None,
        expected_router_registry_service: ExpectedRouterRegistryService | None = None,
        router_registry_runtime_service: RouterRegistryRuntimeService | None = None,
        internal_route_protection_audit_service: InternalRouteProtectionAuditService | None = None,
        deployment_checklist_service: DeploymentChecklistService | None = None,
        launch_operation_manifest_service: LaunchOperationManifestService | None = None,
    ) -> None:
        self.api_router_audit_service = api_router_audit_service or ApiRouterAuditService()
        self.expected_router_registry_service = (
            expected_router_registry_service or ExpectedRouterRegistryService()
        )
        self.router_registry_runtime_service = (
            router_registry_runtime_service or RouterRegistryRuntimeService()
        )
        self.internal_route_protection_audit_service = (
            internal_route_protection_audit_service
            or InternalRouteProtectionAuditService()
        )
        self.deployment_checklist_service = (
            deployment_checklist_service or DeploymentChecklistService()
        )
        self.launch_operation_manifest_service = (
            launch_operation_manifest_service or LaunchOperationManifestService()
        )

    def build(self) -> dict[str, Any]:
        expected = self.expected_router_registry_service.build()[
            "expected_router_registry"
        ]["expected_router_prefixes"]
        runtime_routers = self.router_registry_runtime_service.build()[
            "router_registry_runtime"
        ]["routers"]
        mounted_prefixes = {
            str(item["prefix"]).strip()
            for item in runtime_routers
            if str(item["prefix"]).strip()
        }

        router_audit = self.api_router_audit_service.build(
            mounted_router_prefixes=sorted(mounted_prefixes),
            expected_router_prefixes=expected,
        )["api_router_audit"]

        route_protection = self.internal_route_protection_audit_service.build()[
            "internal_route_protection_audit"
        ]
        deployment = self.deployment_checklist_service.build()[
            "deployment_checklist"
        ]
        launch = self.launch_operation_manifest_service.build()[
            "launch_operation_manifest"
        ]

        closed = (
            router_audit["complete"] is True
            and route_protection["complete"] is True
            and deployment["deploy_allowed"] is True
            and launch["launch_ready"] is True
        )

        blockers: list[str] = []
        if router_audit["complete"] is not True:
            blockers.append("router_inclusion_not_closed")
        if route_protection["complete"] is not True:
            blockers.append("internal_route_protection_not_closed")
        if deployment["deploy_allowed"] is not True:
            blockers.extend(deployment["failing_checks"])
        if launch["launch_ready"] is not True:
            blockers.extend(launch["blockers"])

        return {
            "success": True,
            "final_operational_closure": {
                "closed": closed,
                "blockers": blockers,
                "router_audit": router_audit,
                "route_protection": route_protection,
                "deployment": deployment,
                "launch": launch,
            },
        }
