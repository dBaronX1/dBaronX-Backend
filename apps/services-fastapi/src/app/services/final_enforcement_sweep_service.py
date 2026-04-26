from __future__ import annotations

from typing import Any

from app.services.final_route_protection_closure_service import (
    FinalRouteProtectionClosureService,
)
from app.services.live_mount_registry_consistency_service import (
    LiveMountRegistryConsistencyService,
)
from app.services.protected_route_enforcement_audit_service import (
    ProtectedRouteEnforcementAuditService,
)


class FinalEnforcementSweepService:
    """
    Final FastAPI enforcement sweep.

    This is the final subsystem handoff surface before moving on to Telegram and
    frontend work.
    """

    def __init__(
        self,
        *,
        final_route_protection_closure_service: FinalRouteProtectionClosureService | None = None,
        live_mount_registry_consistency_service: LiveMountRegistryConsistencyService | None = None,
        protected_route_enforcement_audit_service: ProtectedRouteEnforcementAuditService | None = None,
    ) -> None:
        self.final_route_protection_closure_service = (
            final_route_protection_closure_service
            or FinalRouteProtectionClosureService()
        )
        self.live_mount_registry_consistency_service = (
            live_mount_registry_consistency_service
            or LiveMountRegistryConsistencyService()
        )
        self.protected_route_enforcement_audit_service = (
            protected_route_enforcement_audit_service
            or ProtectedRouteEnforcementAuditService()
        )

    def build(self) -> dict[str, Any]:
        route_closure = self.final_route_protection_closure_service.build()[
            "final_route_protection_closure"
        ]
        registry_consistency = self.live_mount_registry_consistency_service.build()[
            "live_mount_registry_consistency"
        ]
        protected_route_enforcement = (
            self.protected_route_enforcement_audit_service.build()[
                "protected_route_enforcement_audit"
            ]
        )

        closed = (
            route_closure["closed"] is True
            and registry_consistency["consistent"] is True
            and protected_route_enforcement["enforced"] is True
        )

        blockers = sorted(
            set(
                list(route_closure["blockers"])
                + list(registry_consistency["missing_prefixes"])
                + list(registry_consistency["extra_prefixes"])
                + list(protected_route_enforcement["missing_protection"])
            )
        )

        return {
            "success": True,
            "final_enforcement_sweep": {
                "closed": closed,
                "blockers": blockers,
                "route_closure": route_closure,
                "registry_consistency": registry_consistency,
                "protected_route_enforcement": protected_route_enforcement,
                "next_subsystem": "telegram_production_surface",
            },
        }
