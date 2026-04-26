from __future__ import annotations

from typing import Any

from app.services.internal_auth_middleware_audit_service import (
    InternalAuthMiddlewareAuditService,
)
from app.services.live_router_mount_closure_service import (
    LiveRouterMountClosureService,
)
from app.services.protected_route_enforcement_audit_service import (
    ProtectedRouteEnforcementAuditService,
)


class FinalRouteProtectionClosureService:
    """
    Final route-protection closure for FastAPI.

    This is the canonical closure surface for:
    - protected-route enforcement
    - live router mount closure
    - internal auth / middleware safety
    """

    def __init__(
        self,
        *,
        protected_route_enforcement_audit_service: ProtectedRouteEnforcementAuditService | None = None,
        live_router_mount_closure_service: LiveRouterMountClosureService | None = None,
        internal_auth_middleware_audit_service: InternalAuthMiddlewareAuditService | None = None,
    ) -> None:
        self.protected_route_enforcement_audit_service = (
            protected_route_enforcement_audit_service
            or ProtectedRouteEnforcementAuditService()
        )
        self.live_router_mount_closure_service = (
            live_router_mount_closure_service or LiveRouterMountClosureService()
        )
        self.internal_auth_middleware_audit_service = (
            internal_auth_middleware_audit_service
            or InternalAuthMiddlewareAuditService()
        )

    def build(self) -> dict[str, Any]:
        protected_routes = self.protected_route_enforcement_audit_service.build()[
            "protected_route_enforcement_audit"
        ]
        live_mount = self.live_router_mount_closure_service.build()[
            "live_router_mount_closure"
        ]
        middleware_audit = self.internal_auth_middleware_audit_service.build()[
            "internal_auth_middleware_audit"
        ]

        closed = (
            protected_routes["enforced"] is True
            and live_mount["closed"] is True
            and middleware_audit["safe"] is True
        )

        blockers = sorted(
            set(
                list(protected_routes["missing_protection"])
                + [
                    item["prefix"]
                    for item in protected_routes["invalid_dependency_binding"]
                ]
                + list(live_mount["missing_prefixes"])
                + list(live_mount["unexpected_prefixes"])
                + list(middleware_audit["blockers"])
            )
        )

        return {
            "success": True,
            "final_route_protection_closure": {
                "closed": closed,
                "blockers": blockers,
                "protected_route_enforcement": protected_routes,
                "live_router_mount_closure": live_mount,
                "internal_auth_middleware_audit": middleware_audit,
            },
        }
