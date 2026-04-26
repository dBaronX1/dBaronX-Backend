from __future__ import annotations

from typing import Any

from app.services.internal_auth_enforcement_audit_service import (
    InternalAuthEnforcementAuditService,
)
from app.services.protected_route_enforcement_audit_service import (
    ProtectedRouteEnforcementAuditService,
)


class InternalAuthMiddlewareAuditService:
    """
    Final auth/middleware audit surface for FastAPI closure.

    This does not inspect Starlette middleware internals directly.
    Instead, it answers whether the currently declared protection contract and
    internal-auth enforcement contract are both aligned.
    """

    def __init__(
        self,
        *,
        internal_auth_enforcement_audit_service: InternalAuthEnforcementAuditService | None = None,
        protected_route_enforcement_audit_service: ProtectedRouteEnforcementAuditService | None = None,
    ) -> None:
        self.internal_auth_enforcement_audit_service = (
            internal_auth_enforcement_audit_service
            or InternalAuthEnforcementAuditService()
        )
        self.protected_route_enforcement_audit_service = (
            protected_route_enforcement_audit_service
            or ProtectedRouteEnforcementAuditService()
        )

    def build(self) -> dict[str, Any]:
        internal_auth = self.internal_auth_enforcement_audit_service.build()[
            "internal_auth_enforcement_audit"
        ]
        protected_routes = self.protected_route_enforcement_audit_service.build()[
            "protected_route_enforcement_audit"
        ]

        middleware_safe = (
            internal_auth["enforced"] is True
            and protected_routes["enforced"] is True
        )

        return {
            "success": True,
            "internal_auth_middleware_audit": {
                "safe": middleware_safe,
                "internal_auth_enforced": internal_auth["enforced"],
                "protected_routes_enforced": protected_routes["enforced"],
                "blockers": sorted(
                    set(
                        list(internal_auth["uncovered_guarded_prefixes"])
                        + list(protected_routes["missing_protection"])
                        + [
                            item["prefix"]
                            for item in protected_routes["invalid_dependency_binding"]
                        ]
                    )
                ),
            },
        }
