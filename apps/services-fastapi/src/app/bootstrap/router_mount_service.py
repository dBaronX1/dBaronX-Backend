from __future__ import annotations

from typing import Any

from fastapi import FastAPI

from app.api.router_registry import get_router_registrations


class RouterMountService:
    """
    Canonical router mount service.

    This is the single authoritative mount path for the FastAPI shell.
    It prevents drift between route declarations and mounted runtime state.
    """

    def mount(self, app: FastAPI) -> dict[str, Any]:
        registrations = get_router_registrations()

        mounted: list[dict[str, Any]] = []
        for registration in registrations:
            app.include_router(registration.router)
            mounted.append(
                {
                    "name": registration.name,
                    "prefix": registration.prefix,
                    "internal_only": registration.internal_only,
                    "critical": registration.critical,
                }
            )

        app.state.mounted_router_registry = mounted

        return {
            "success": True,
            "router_mount": {
                "count": len(mounted),
                "mounted": mounted,
            },
        }
