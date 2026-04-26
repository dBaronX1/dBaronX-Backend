from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ProtectedRouteSpec:
    prefix: str
    protected: bool
    dependency_name: str | None


def get_protected_route_specs() -> list[ProtectedRouteSpec]:
    """
    Runtime-declared route protection contract.

    This is intentionally separate from policy intent so we can audit:
    - what SHOULD be protected
    - what IS declared as protected
    """

    return [
        ProtectedRouteSpec(
            prefix="/decision-trace",
            protected=True,
            dependency_name="require_internal_access",
        ),
        ProtectedRouteSpec(
            prefix="/request-audit-envelope",
            protected=True,
            dependency_name="require_internal_access",
        ),
        ProtectedRouteSpec(
            prefix="/decision-bundle",
            protected=True,
            dependency_name="require_internal_access",
        ),
        ProtectedRouteSpec(
            prefix="/runtime-export-manifest",
            protected=True,
            dependency_name="require_internal_access",
        ),
    ]
