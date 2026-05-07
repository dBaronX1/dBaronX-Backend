from __future__ import annotations

from typing import Any

from app.services.internal_endpoint_guard_manifest_service import (
    InternalEndpointGuardManifestService,
)
from app.services.router_registration_manifest_service import (
    RouterRegistrationManifestService,
)


class InternalAuthEnforcementAuditService:
    """Canonical internal-auth enforcement audit."""

    def __init__(
        self,
        *,
        internal_endpoint_guard_manifest_service: (
            InternalEndpointGuardManifestService | None
        ) = None,
        router_registration_manifest_service: RouterRegistrationManifestService | None = None,
    ) -> None:
        self.internal_endpoint_guard_manifest_service = (
            internal_endpoint_guard_manifest_service
            or InternalEndpointGuardManifestService()
        )
        self.router_registration_manifest_service = (
            router_registration_manifest_service or RouterRegistrationManifestService()
        )

    def build(self) -> dict[str, Any]:
        registrations = self.router_registration_manifest_service.build()[
            "router_registration_manifest"
        ]["routers"]
        guard_manifest = self.internal_endpoint_guard_manifest_service.build()[
            "internal_endpoint_guard_manifest"
        ]["guarded_prefixes"]
        guarded_prefixes = {
            prefix for group in guard_manifest.values() for prefix in group
        }
        internal_only_prefixes = {
            str(item["prefix"]).strip()
            for item in registrations
            if str(item["prefix"]).strip() and item["internal_only"] is True
        }

        uncovered_guarded_prefixes = sorted(guarded_prefixes - internal_only_prefixes)
        unexpected_internal_only_prefixes = sorted(
            internal_only_prefixes - guarded_prefixes
        )
        return {
            "success": True,
            "internal_auth_enforcement_audit": {
                "enforced": len(uncovered_guarded_prefixes) == 0,
                "guarded_prefix_count": len(guarded_prefixes),
                "internal_only_prefix_count": len(internal_only_prefixes),
                "uncovered_guarded_prefixes": uncovered_guarded_prefixes,
                "unexpected_internal_only_prefixes": unexpected_internal_only_prefixes,
            },
        }
