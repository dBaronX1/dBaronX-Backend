from __future__ import annotations

from typing import Any

from app.api.router_registry import get_router_registrations


class RouterRegistryRuntimeService:
    """
    Canonical runtime view of router registrations.

    This is the source of truth for mounted router intent and is used for:
    - router inclusion verification
    - startup compatibility checks
    - launch-grade route summaries
    """

    def build(self) -> dict[str, Any]:
        registrations = get_router_registrations()

        return {
            "success": True,
            "router_registry_runtime": {
                "count": len(registrations),
                "routers": [
                    {
                        "name": item.name,
                        "prefix": item.prefix,
                        "internal_only": item.internal_only,
                        "critical": item.critical,
                    }
                    for item in registrations
                ],
            },
        }
