from __future__ import annotations

from fastapi import FastAPI

from crypto.dbx_error_handlers import register_dbx_error_handlers
from crypto.middleware.dbx_request_context import DbxRequestContextMiddleware
from crypto.startup.dbx_startup_checks import DbxStartupChecks


def install_dbx_runtime(app: FastAPI) -> None:
    app.add_middleware(DbxRequestContextMiddleware)
    register_dbx_error_handlers(app)

    @app.on_event("startup")
    async def dbx_startup() -> None:
        DbxStartupChecks().assert_ready()