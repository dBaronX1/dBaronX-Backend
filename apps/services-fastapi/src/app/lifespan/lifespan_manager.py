from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.config.settings import FastApiSettings
from app.observability.structured_logger import configure_logging, log_event
from app.registry.runtime_registry import runtime_route_registry
from app.startup.startup_checks import AppStartupChecks
from crypto.startup.dbx_startup_checks import DbxStartupChecks


def build_lifespan(settings: FastApiSettings):
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging()

        app_report = AppStartupChecks(settings).run()
        dbx_report = DbxStartupChecks().run()

        app.state.startup_report = app_report.as_dict()
        app.state.dbx_startup_report = dbx_report.as_dict()

        if not app_report.ok and settings.strict_startup_validation:
            raise RuntimeError(f"FastAPI startup checks failed: {app_report.failures}")

        if not dbx_report.ok and settings.strict_startup_validation:
            raise RuntimeError(f"DBX startup checks failed: {dbx_report.failures}")

        required_route_failures = runtime_route_registry.required_failures()
        if required_route_failures and settings.strict_route_mount:
            raise RuntimeError(
                f"Required FastAPI routes failed to mount: {required_route_failures}"
            )

        log_event(
            "fastapi.startup.completed",
            service=settings.service_name,
            env=settings.app_env,
            version=settings.app_version,
            appStartup=app_report.as_dict(),
            dbxStartup=dbx_report.as_dict(),
            routes=runtime_route_registry.snapshot(),
        )

        yield

        log_event(
            "fastapi.shutdown.completed",
            service=settings.service_name,
            env=settings.app_env,
            version=settings.app_version,
        )

    return lifespan