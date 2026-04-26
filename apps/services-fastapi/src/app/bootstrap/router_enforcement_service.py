from __future__ import annotations

from typing import Any

from app.api.router_registry import get_router_registrations
from app.services.internal_endpoint_guard_manifest_service import (
    InternalEndpointGuardManifestService,
)


class RouterEnforcementService:
    """
    Canonical router-enforcement verifier.

    Ensures runtime router registration aligns with internal protection intent.
    This is the last shell/bootstrap safety layer before handing focus to NestJS.
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
            prefix.strip()
            for values in guard_manifest.values()
            for prefix in values
            if str(prefix).strip()
        }

        issues: list[dict[str, Any]] = []
        coverage: list[dict[str, Any]] = []

        for registration in registrations:
            prefix = registration.prefix.strip()
            if not prefix:
                continue

            expected_internal = prefix in guarded_prefixes
            actual_internal = registration.internal_only

            coverage.append(
                {
                    "name": registration.name,
                    "prefix": prefix,
                    "critical": registration.critical,
                    "expected_internal": expected_internal,
                    "actual_internal": actual_internal,
                    "enforced": expected_internal == actual_internal,
                }
            )

            if expected_internal != actual_internal:
                issues.append(
                    {
                        "name": registration.name,
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
