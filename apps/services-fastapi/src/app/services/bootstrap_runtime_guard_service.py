from __future__ import annotations

from typing import Any

from app.bootstrap.router_enforcement_service import RouterEnforcementService
from app.bootstrap.startup_validation_service import StartupValidationService
from app.services.router_mount_verification_service import (
    RouterMountVerificationService,
)


class BootstrapRuntimeGuardService:
    """
    Canonical runtime guard used at bootstrap and launch verification time.

    This is the final FastAPI shell guard before control moves to NestJS
    orchestration and cross-system launch logic.
    """

    def __init__(
        self,
        *,
        startup_validation_service: StartupValidationService | None = None,
        router_mount_verification_service: RouterMountVerificationService | None = None,
        router_enforcement_service: RouterEnforcementService | None = None,
    ) -> None:
        self.startup_validation_service = (
            startup_validation_service or StartupValidationService()
        )
        self.router_mount_verification_service = (
            router_mount_verification_service or RouterMountVerificationService()
        )
        self.router_enforcement_service = (
            router_enforcement_service or RouterEnforcementService()
        )

    def build(self) -> dict[str, Any]:
        startup_validation = self.startup_validation_service.build()[
            "startup_validation"
        ]
        mount_verification = self.router_mount_verification_service.build()[
            "router_mount_verification"
        ]
        router_enforcement = self.router_enforcement_service.build()[
            "router_enforcement"
        ]

        blockers: list[str] = []
        if startup_validation["startup_safe"] is not True:
            blockers.extend(startup_validation["blockers"])
        if mount_verification["verified"] is not True:
            blockers.append("router_mount_verification_failed")
        if router_enforcement["enforced"] is not True:
            blockers.append("router_enforcement_failed")

        return {
            "success": True,
            "bootstrap_runtime_guard": {
                "guard_passed": len(blockers) == 0,
                "blockers": sorted(set(blockers)),
                "startup_safe": startup_validation["startup_safe"],
                "router_mount_verified": mount_verification["verified"],
                "router_enforcement_passed": router_enforcement["enforced"],
            },
        }
