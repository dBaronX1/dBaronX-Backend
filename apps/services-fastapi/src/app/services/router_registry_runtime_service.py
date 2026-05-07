from __future__ import annotations

from typing import Any

from app.services.router_registration_manifest_service import RouterRegistrationManifestService


class RouterRegistryRuntimeService:
    """Canonical runtime view of router registrations."""

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
        return {
            "success": True,
            "router_registry_runtime": {
                "count": len(routers),
                "routers": routers,
            },
        }
