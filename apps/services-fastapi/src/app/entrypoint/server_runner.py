from __future__ import annotations

import logging
from typing import Any

import uvicorn

from app.server.uvicorn_config import build_uvicorn_config

logger = logging.getLogger("dbaronx.fastapi.server_runner")


def run_server(app_object: Any | None = None) -> None:
    config = build_uvicorn_config()

    logger.info(
        "Starting FastAPI server host=%s port=%s workers=%s reload=%s",
        config.host,
        config.port,
        config.workers,
        config.reload,
    )

    if config.reload:
        uvicorn.run(**config.as_kwargs())
        return

    kwargs = config.as_kwargs()

    if app_object is not None:
        kwargs["app"] = app_object

    uvicorn.run(**kwargs)