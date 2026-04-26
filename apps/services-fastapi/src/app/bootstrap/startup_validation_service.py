from __future__ import annotations

from typing import Any

from app.services.dependency_wiring_audit_service import (
    DependencyWiringAuditService,
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


class StartupValidationService:
    """
    Canonical startup validation service for the FastAPI shell.

    This is the bootstrap-safe verification layer invoked during app startup.
    It intentionally avoids DB writes and other heavy runtime side effects.
    """

    def __init__(
        self,
        *,
        runtime_dependency_manifest_service: RuntimeDependencyManifestService | None = None,
        router_mount_verification_service: RouterMountVerificationService | None = None,
        internal_auth_enforcement_audit_service: InternalAuthEnforcementAuditService | None = None,
        dependency_wiring_audit_service: DependencyWiringAuditService | None = None,
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
        self.dependency_wiring_audit_service = (
            dependency_wiring_audit_service or DependencyWiringAuditService()
        )

    def build(self) -> dict[str, Any]:
        runtime_dependencies = self.runtime_dependency_manifest_service.build()[
            "runtime_dependency_manifest"
        ]
        router_mount_verification = self.router_mount_verification_service.build()[
            "router_mount_verification"
        ]
        internal_auth_enforcement = self.internal_auth_enforcement_audit_service.build()[
            "internal_auth_enforcement_audit"
        ]
        dependency_wiring = self.dependency_wiring_audit_service.build()[
            "dependency_wiring_audit"
        ]

        blockers: list[str] = []

        if runtime_dependencies["launch_dependencies_ready"] is not True:
            blockers.append("runtime_dependencies_not_ready")

        if router_mount_verification["verified"] is not True:
            blockers.append("router_mount_verification_failed")

        if internal_auth_enforcement["enforced"] is not True:
            blockers.append("internal_auth_enforcement_failed")

        if dependency_wiring["wired"] is not True:
            blockers.extend(dependency_wiring["failing_checks"])

        return {
            "success": True,
            "startup_validation": {
                "startup_safe": len(blockers) == 0,
                "blockers": sorted(set(blockers)),
                "runtime_dependencies": runtime_dependencies,
                "router_mount_verification": router_mount_verification,
                "internal_auth_enforcement": internal_auth_enforcement,
                "dependency_wiring": dependency_wiring,
            },
        }
