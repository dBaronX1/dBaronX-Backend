from __future__ import annotations

from typing import Any

from app.services.router_mount_verification_service import (
    RouterMountVerificationService,
)
from app.services.router_registry_runtime_service import (
    RouterRegistryRuntimeService,
)


class LiveRouterMountClosureService:
    """
    Final live mount closure surface.

    This is the last direct statement on whether mounted routers match the
    runtime registry strongly enough to consider route mounting closed.
    """

    def __init__(
        self,
        *,
        router_mount_verification_service: RouterMountVerificationService | None = None,
        router_registry_runtime_service: RouterRegistryRuntimeService | None = None,
    ) -> None:
        self.router_mount_verification_service = (
            router_mount_verification_service or RouterMountVerificationService()
        )
        self.router_registry_runtime_service = (
            router_registry_runtime_service or RouterRegistryRuntimeService()
        )

    def build(self) -> dict[str, Any]:
        verification = self.router_mount_verification_service.build()[
            "router_mount_verification"
        ]
        registry = self.router_registry_runtime_service.build()[
            "router_registry_runtime"
        ]

        critical_router_count = len(
            [item for item in registry["routers"] if item["critical"] is True]
        )

        return {
            "success": True,
            "live_router_mount_closure": {
                "closed": verification["verified"],
                "critical_router_count": critical_router_count,
                "runtime_router_count": registry["count"],
                "missing_prefixes": verification["missing_prefixes"],
                "unexpected_prefixes": verification["unexpected_prefixes"],
            },
        }
