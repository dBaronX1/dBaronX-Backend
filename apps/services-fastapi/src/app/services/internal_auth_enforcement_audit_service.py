from __future__ import annotations

from typing import Any

from app.api.router_registry import get_router_registrations
from app.services.internal_endpoint_guard_manifest_service import (
    InternalEndpointGuardManifestService,
)


class InternalAuthEnforcementAuditService:
    """
    Canonical internal-auth enforcement audit.

    Compares:
    - routes marked internal_only in runtime router registry
    - route families declared as guarded by policy

    This closes the loop between protection intent and mount-time contract.
    """

    def __init__(
        self,
        *,
        internal_endpoint_guard_manifest_service: InternalEndpointGuardManifestService | None = None,
    ) -> None:
        self.internal_endpoint_guard_manifest_service = (
            internal_endpoint_guard_manifest_service
            or InternalEndpointGuardManifestService()
        )

    def build(self) -> dict[str, Any]:
        registrations = get_router_registrations()
        guard_manifest = self.internal_endpoint_guard_manifest_service.build()[
            "internal_endpoint_guard_manifest"
        ]["guarded_prefixes"]

        guarded_prefixes = {
            prefix
            for group in guard_manifest.values()
            for prefix in group
        }
        internal_only_prefixes = {
            item.prefix.strip()
            for item in registrations
            if item.prefix.strip() and item.internal_only
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
