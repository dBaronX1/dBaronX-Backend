from __future__ import annotations

from typing import Any

from app.services.router_registration_manifest_service import RouterRegistrationManifestService


class ExpectedRouterRegistryService:
    """Canonical expected-router registry derived from router registration intent."""

    def __init__(
        self,
        *,
        manifest_service: RouterRegistrationManifestService | None = None,
    ) -> None:
        self.manifest_service = (
            manifest_service or RouterRegistrationManifestService()
        )

    def build(self) -> dict[str, Any]:
        routers = self.manifest_service.build()["router_registration_manifest"][
            "routers"
        ]
        router_prefixes = sorted(
            {
                str(item["prefix"]).strip()
                for item in routers
                if str(item["prefix"]).strip()
            }
        )
        return {
            "success": True,
            "expected_router_registry": {
                "version": "1.0.0",
                "expected_router_prefixes": router_prefixes,
                "expected_count": len(router_prefixes),
            },
        }
