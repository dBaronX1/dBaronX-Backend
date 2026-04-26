from __future__ import annotations

import importlib
import logging
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter

from app.registry.route_manifest import APP_ROUTE_MANIFEST, AppRouteManifestEntry

logger = logging.getLogger("dbaronx.fastapi.runtime_registry")


class RuntimeRouteRegistry:
    def __init__(self) -> None:
        self.mounted: list[dict[str, Any]] = []
        self.failed: list[dict[str, Any]] = []

    def mount_all(self, target: APIRouter, *, strict: bool = True) -> None:
        for entry in APP_ROUTE_MANIFEST:
            self.mount(target, entry, strict=strict)

    def mount(
        self,
        target: APIRouter,
        entry: AppRouteManifestEntry,
        *,
        strict: bool,
    ) -> None:
        try:
            module = importlib.import_module(entry.module_path)
            router = getattr(module, entry.router_name)

            target.include_router(
                router,
                prefix=entry.prefix,
                tags=list(entry.tags),
            )

            mounted = {
                **asdict(entry),
                "required": entry.required,
            }
            self.mounted.append(mounted)

            logger.info(
                "Mounted FastAPI route module=%s prefix=%s required=%s",
                entry.module_path,
                entry.prefix,
                entry.required,
            )
        except Exception as exc:
            failure = {
                **asdict(entry),
                "required": entry.required,
                "error": exc.__class__.__name__,
                "message": str(exc),
            }
            self.failed.append(failure)

            logger.warning(
                "Failed to mount FastAPI route module=%s required=%s error=%s",
                entry.module_path,
                entry.required,
                exc,
            )

            if strict and entry.required:
                raise RuntimeError(f"Required FastAPI route failed: {failure}") from exc

    def required_failures(self) -> list[dict[str, Any]]:
        return [failure for failure in self.failed if failure.get("required") is True]

    def snapshot(self) -> dict[str, Any]:
        return {
            "mounted": self.mounted,
            "failed": self.failed,
            "requiredFailures": self.required_failures(),
        }


runtime_route_registry = RuntimeRouteRegistry()