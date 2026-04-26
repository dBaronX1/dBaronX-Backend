from __future__ import annotations

from typing import Any

from app.services.expected_router_registry_service import (
    ExpectedRouterRegistryService,
)
from app.services.router_registry_runtime_service import (
    RouterRegistryRuntimeService,
)


class LiveMountRegistryConsistencyService:
    """
    Focused consistency service comparing expected registry intent against the
    current runtime registry.

    This differs from route-level verification because it reasons about router
    families as registry entries, not just discovered prefixes.
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
        expected = set(
            self.expected_router_registry_service.build()["expected_router_registry"][
                "expected_router_prefixes"
            ]
        )
        runtime = {
            str(item["prefix"]).strip()
            for item in self.router_registry_runtime_service.build()[
                "router_registry_runtime"
            ]["routers"]
            if str(item["prefix"]).strip()
        }

        missing = sorted(expected - runtime)
        extra = sorted(runtime - expected)

        return {
            "success": True,
            "live_mount_registry_consistency": {
                "consistent": len(missing) == 0 and len(extra) == 0,
                "expected_count": len(expected),
                "runtime_count": len(runtime),
                "missing_prefixes": missing,
                "extra_prefixes": extra,
            },
        }
