from __future__ import annotations

from typing import Any

from fastapi import APIRouter, FastAPI

from app.config.settings import FastApiSettings
from app.health.readiness import ReadinessService
from app.registry.runtime_registry import runtime_route_registry
from app.responses.envelope import success_response


class RouterInstaller:
    def __init__(self, settings: FastApiSettings) -> None:
        self.settings = settings
        self.router = APIRouter()

    def install(self, app: FastAPI) -> None:
        self._install_core_routes()
        runtime_route_registry.mount_all(
            self.router,
            strict=self.settings.strict_route_mount,
        )

        app.include_router(self.router)

        snapshot = runtime_route_registry.snapshot()
        app.state.mounted_routes = snapshot["mounted"]
        app.state.failed_route_mounts = snapshot["failed"]

    def _install_core_routes(self) -> None:
        @self.router.get("/")
        async def root() -> dict[str, Any]:
            return success_response(
                data={
                    "service": self.settings.service_name,
                    "name": self.settings.app_name,
                    "env": self.settings.app_env,
                    "version": self.settings.app_version,
                },
                message="dBaronX FastAPI intelligence layer",
            )

        @self.router.get("/health")
        async def health() -> dict[str, Any]:
            return await ReadinessService().check()

        @self.router.get("/health/live")
        async def live() -> dict[str, Any]:
            return success_response(
                data={
                    "service": self.settings.service_name,
                    "status": "live",
                    "version": self.settings.app_version,
                },
            )

        @self.router.get("/health/ready")
        async def ready() -> dict[str, Any]:
            return await ReadinessService().check()

        @self.router.get("/runtime/routes")
        async def runtime_routes() -> dict[str, Any]:
            return success_response(
                data=runtime_route_registry.snapshot(),
            )