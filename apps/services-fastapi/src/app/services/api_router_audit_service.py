from __future__ import annotations

from typing import Any


class ApiRouterAuditService:
    """
    Canonical API router audit model source.

    This service intentionally remains route-agnostic and produces the audit
    structure expected by a future router-mount snapshot endpoint or startup hook.
    It is used to verify router inclusion completeness at runtime.
    """

    def build(
        self,
        *,
        mounted_router_prefixes: list[str],
        expected_router_prefixes: list[str],
    ) -> dict[str, Any]:
        mounted = {str(item).strip() for item in mounted_router_prefixes if str(item).strip()}
        expected = {str(item).strip() for item in expected_router_prefixes if str(item).strip()}

        missing = sorted(expected - mounted)
        unexpected = sorted(mounted - expected)
        complete = len(missing) == 0

        return {
            "success": True,
            "api_router_audit": {
                "complete": complete,
                "mounted_count": len(mounted),
                "expected_count": len(expected),
                "missing_router_prefixes": missing,
                "unexpected_router_prefixes": unexpected,
                "mounted_router_prefixes": sorted(mounted),
            },
        }
