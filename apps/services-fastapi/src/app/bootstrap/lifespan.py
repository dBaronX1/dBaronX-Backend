from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.bootstrap.router_mount_service import RouterMountService
from app.bootstrap.startup_validation_service import StartupValidationService

logger = logging.getLogger("dbaronx.fastapi.lifespan")


@asynccontextmanager
async def app_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Canonical FastAPI lifespan manager.

    Startup duties:
    - mount canonical router registry
    - run shell-safe startup validation
    - store startup state on app.state for diagnostics
    """

    router_mount = RouterMountService().mount(app)
    startup_validation = StartupValidationService().build()

    app.state.router_mount = router_mount["router_mount"]
    app.state.startup_validation = startup_validation["startup_validation"]

    logger.info(
        "FastAPI startup completed: mounted=%s startup_safe=%s blockers=%s",
        app.state.router_mount["count"],
        app.state.startup_validation["startup_safe"],
        app.state.startup_validation["blockers"],
    )

    try:
        yield
    finally:
        logger.info("FastAPI shutdown completed")
