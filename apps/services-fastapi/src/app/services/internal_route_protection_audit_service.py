from __future__ import annotations

from typing import Any

from app.services.expected_router_registry_service import (
    ExpectedRouterRegistryService,
)
from app.services.internal_endpoint_guard_manifest_service import (
    InternalEndpointGuardManifestService,
)


class InternalRouteProtectionAuditService:
    """
    Canonical audit for route protection intent.

    This is a manifest-level audit, not middleware introspection.
    It verifies that every declared guarded prefix is part of the expected router
    registry and therefore can be enforced consistently during integration.
    """

    def __init__(
        self,
        *,
        expected_router_registry_service: ExpectedRouterRegistryService | None = None,
        internal_endpoint_guard_manifest_service: InternalEndpointGuardManifestService | None = None,
    ) -> None:
        self.expected_router_registry_service = (
            expected_router_registry_service or ExpectedRouterRegistryService()
        )
        self.internal_endpoint_guard_manifest_service = (
            internal_endpoint_guard_manifest_service
            or InternalEndpointGuardManifestService()
        )

    def build(self) -> dict[str, Any]:
        expected = set(
            self.expected_router_registry_service.build()["expected_router_registry"][
                "expected_router_prefixes"
            ]
        )
        guard_manifest = self.internal_endpoint_guard_manifest_service.build()[
            "internal_endpoint_guard_manifest"
        ]["guarded_prefixes"]

        missing_guard_targets: list[dict[str, Any]] = []
        coverage: dict[str, Any] = {}

        for group_name, prefixes in guard_manifest.items():
            missing = sorted([prefix for prefix in prefixes if prefix not in expected])
            coverage[group_name] = {
                "declared_count": len(prefixes),
                "missing_count": len(missing),
                "missing_prefixes": missing,
            }
            if missing:
                missing_guard_targets.append(
                    {
                        "group": group_name,
                        "missing_prefixes": missing,
                    }
                )

        return {
            "success": True,
            "internal_route_protection_audit": {
                "complete": len(missing_guard_targets) == 0,
                "coverage": coverage,
                "issues": missing_guard_targets,
            },
        }
