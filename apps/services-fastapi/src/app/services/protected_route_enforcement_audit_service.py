from __future__ import annotations

from typing import Any

from app.security.protected_route_registry import get_protected_route_specs
from app.security.route_guard_registry import get_guarded_route_families


class ProtectedRouteEnforcementAuditService:
    """
    Final FastAPI enforcement audit.

    Compares:
    - guarded route families that MUST be internal-only
    - protected route declarations that claim real dependency enforcement
    """

    def build(self) -> dict[str, Any]:
        guarded = {item.prefix: item for item in get_guarded_route_families()}
        declared = {item.prefix: item for item in get_protected_route_specs()}

        missing_protection: list[str] = []
        invalid_dependency_binding: list[dict[str, Any]] = []

        for prefix, spec in guarded.items():
            declared_spec = declared.get(prefix)
            if declared_spec is None or declared_spec.protected is not True:
                missing_protection.append(prefix)
                continue

            if declared_spec.dependency_name != "require_internal_access":
                invalid_dependency_binding.append(
                    {
                        "prefix": prefix,
                        "dependency_name": declared_spec.dependency_name,
                        "expected_dependency_name": "require_internal_access",
                    }
                )

        unexpected_protected_prefixes = sorted(
            set(declared.keys()) - set(guarded.keys())
        )

        enforced = (
            len(missing_protection) == 0
            and len(invalid_dependency_binding) == 0
        )

        return {
            "success": True,
            "protected_route_enforcement_audit": {
                "enforced": enforced,
                "guarded_prefix_count": len(guarded),
                "declared_protected_prefix_count": len(declared),
                "missing_protection": sorted(missing_protection),
                "invalid_dependency_binding": invalid_dependency_binding,
                "unexpected_protected_prefixes": unexpected_protected_prefixes,
            },
        }
