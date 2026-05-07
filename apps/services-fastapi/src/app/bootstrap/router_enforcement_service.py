from __future__ import annotations

from typing import Any

from app.services.internal_endpoint_guard_manifest_service import (
    InternalEndpointGuardManifestService,
)
from app.services.router_registration_manifest_service import (
    RouterRegistrationManifestService,
)


class RouterEnforcementService:
    """Verifies runtime router registration aligns with internal protection intent."""

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
            prefix.strip()
            for values in guard_manifest.values()
            for prefix in values
            if str(prefix).strip()
        }

        issues: list[dict[str, Any]] = []
        coverage: list[dict[str, Any]] = []
        for registration in registrations:
            prefix = str(registration["prefix"]).strip()
            if not prefix:
                continue
            expected_internal = prefix in guarded_prefixes
            actual_internal = registration["internal_only"] is True
            coverage.append(
                {
                    "name": registration["name"],
                    "prefix": prefix,
                    "critical": registration["critical"],
                    "expected_internal": expected_internal,
                    "actual_internal": actual_internal,
                    "enforced": expected_internal == actual_internal,
                }
            )
            if expected_internal != actual_internal:
                issues.append(
                    {
                        "name": registration["name"],
                        "prefix": prefix,
                        "expected_internal": expected_internal,
                        "actual_internal": actual_internal,
                    }
                )

        return {
            "success": True,
            "router_enforcement": {
                "enforced": len(issues) == 0,
                "route_count": len(coverage),
                "issues": issues,
                "coverage": coverage,
            },
        }
