from __future__ import annotations

from typing import Any

from app.services.expected_router_registry_service import (
    ExpectedRouterRegistryService,
)
from app.services.router_registry_runtime_service import (
    RouterRegistryRuntimeService,
)


class RouterMountVerificationService:
    """
    Canonical verification service for real router mount intent.

    This compares:
    - expected canonical prefixes
    - runtime router registration prefixes

    It is stricter and more direct than route group inference.
    """

    def __init__(
        self,
        *,
        expected_router_registry_service: ExpectedRouterRegistryService | None = None,
        router_registry_runtime_service: RouterRegistryRuntimeService | None = None,
    ) -> None:
        self.expected_router_registry_service = (
            expected_router_registry_service or ExpectedRouterRegistryService()
        )
        self.router_registry_runtime_service = (
            router_registry_runtime_service or RouterRegistryRuntimeService()
        )

    def build(self) -> dict[str, Any]:
        expected_prefixes = set(
            self.expected_router_registry_service.build()["expected_router_registry"][
                "expected_router_prefixes"
            ]
        )
        runtime_prefixes = {
            str(item["prefix"]).strip()
            for item in self.router_registry_runtime_service.build()[
                "router_registry_runtime"
            ]["routers"]
            if str(item["prefix"]).strip()
        }

        missing = sorted(expected_prefixes - runtime_prefixes)
        unexpected = sorted(runtime_prefixes - expected_prefixes)

        return {
            "success": True,
            "router_mount_verification": {
                "verified": len(missing) == 0,
                "expected_count": len(expected_prefixes),
                "runtime_count": len(runtime_prefixes),
                "missing_prefixes": missing,
                "unexpected_prefixes": unexpected,
            },
        }
