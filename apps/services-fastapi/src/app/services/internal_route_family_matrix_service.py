from __future__ import annotations

from typing import Any

from app.security.protected_route_registry import get_protected_route_specs
from app.security.route_guard_registry import get_guarded_route_families


class InternalRouteFamilyMatrixService:
    """
    Matrix showing expected guarded route families against declared protection.
    Useful for Telegram/admin consumption.
    """

    def build(self) -> dict[str, Any]:
        guarded = {item.prefix: item for item in get_guarded_route_families()}
        declared = {item.prefix: item for item in get_protected_route_specs()}

        matrix: list[dict[str, Any]] = []
        for prefix, guarded_spec in guarded.items():
            declared_spec = declared.get(prefix)
            matrix.append(
                {
                    "prefix": prefix,
                    "reason": guarded_spec.reason,
                    "enforcement_mode": guarded_spec.enforcement_mode,
                    "declared_protected": (
                        declared_spec.protected if declared_spec else False
                    ),
                    "dependency_name": (
                        declared_spec.dependency_name if declared_spec else None
                    ),
                    "correctly_bound": (
                        declared_spec is not None
                        and declared_spec.protected is True
                        and declared_spec.dependency_name
                        == "require_internal_access"
                    ),
                }
            )

        return {
            "success": True,
            "internal_route_family_matrix": {
                "count": len(matrix),
                "matrix": matrix,
            },
        }
