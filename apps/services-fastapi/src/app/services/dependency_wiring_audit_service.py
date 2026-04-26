from __future__ import annotations

from typing import Any

from app.services.final_operational_closure_service import (
    FinalOperationalClosureService,
)
from app.services.internal_auth_enforcement_audit_service import (
    InternalAuthEnforcementAuditService,
)
from app.services.router_mount_verification_service import (
    RouterMountVerificationService,
)
from app.services.runtime_dependency_manifest_service import (
    RuntimeDependencyManifestService,
)


class DependencyWiringAuditService:
    """
    Canonical dependency wiring audit for final FastAPI closure.

    Focus:
    - runtime dependency presence
    - router mount verification
    - internal auth enforcement audit
    - final operational closure alignment
    """

    def __init__(
        self,
        *,
        runtime_dependency_manifest_service: RuntimeDependencyManifestService | None = None,
        router_mount_verification_service: RouterMountVerificationService | None = None,
        internal_auth_enforcement_audit_service: InternalAuthEnforcementAuditService | None = None,
        final_operational_closure_service: FinalOperationalClosureService | None = None,
    ) -> None:
        self.runtime_dependency_manifest_service = (
            runtime_dependency_manifest_service or RuntimeDependencyManifestService()
        )
        self.router_mount_verification_service = (
            router_mount_verification_service or RouterMountVerificationService()
        )
        self.internal_auth_enforcement_audit_service = (
            internal_auth_enforcement_audit_service
            or InternalAuthEnforcementAuditService()
        )
        self.final_operational_closure_service = (
            final_operational_closure_service or FinalOperationalClosureService()
        )

    def build(self) -> dict[str, Any]:
        runtime = self.runtime_dependency_manifest_service.build()[
            "runtime_dependency_manifest"
        ]
        mount_verification = self.router_mount_verification_service.build()[
            "router_mount_verification"
        ]
        auth_enforcement = self.internal_auth_enforcement_audit_service.build()[
            "internal_auth_enforcement_audit"
        ]
        closure = self.final_operational_closure_service.build()[
            "final_operational_closure"
        ]

        checks = {
            "runtime_dependencies_ready": runtime["launch_dependencies_ready"],
            "router_mount_verified": mount_verification["verified"],
            "internal_auth_enforced": auth_enforcement["enforced"],
            "final_operational_closure_closed": closure["closed"],
        }

        failing_checks = [name for name, passed in checks.items() if passed is not True]

        return {
            "success": True,
            "dependency_wiring_audit": {
                "wired": len(failing_checks) == 0,
                "checks": checks,
                "failing_checks": failing_checks,
            },
        }
