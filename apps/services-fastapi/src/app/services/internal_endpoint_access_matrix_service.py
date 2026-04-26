from __future__ import annotations

from typing import Any

from app.services.expected_router_registry_service import (
    ExpectedRouterRegistryService,
)
from app.services.internal_endpoint_guard_manifest_service import (
    InternalEndpointGuardManifestService,
)


class InternalEndpointAccessMatrixService:
    """
    Canonical access matrix for route families.

    This converts protection intent into a stable route-prefix access table
    that can be consumed by ops, NestJS, and Telegram.
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
        expected_prefixes = self.expected_router_registry_service.build()[
            "expected_router_registry"
        ]["expected_router_prefixes"]

        guard_manifest = self.internal_endpoint_guard_manifest_service.build()[
            "internal_endpoint_guard_manifest"
        ]["guarded_prefixes"]

        guarded_prefixes = {
            prefix
            for groups in guard_manifest.values()
            for prefix in groups
        }

        matrix: list[dict[str, Any]] = []
        for prefix in expected_prefixes:
            if prefix in guarded_prefixes:
                access_mode = "internal_only"
            else:
                access_mode = "public_or_optional_internal"

            matrix.append(
                {
                    "prefix": prefix,
                    "access_mode": access_mode,
                }
            )

        return {
            "success": True,
            "internal_endpoint_access_matrix": {
                "route_count": len(matrix),
                "matrix": matrix,
            },
        }
