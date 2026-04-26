from __future__ import annotations

from fastapi import FastAPI

from app.errors.error_handlers import register_core_error_handlers
from crypto.dbx_error_handlers import register_dbx_error_handlers


class ExceptionInstaller:
    def install(self, app: FastAPI) -> None:
        register_core_error_handlers(app)
        register_dbx_error_handlers(app)

        app.state.exception_handlers_installed = [
            "core",
            "dbx",
        ]