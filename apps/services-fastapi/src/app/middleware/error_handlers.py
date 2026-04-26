from __future__ import annotations

import traceback
from logging import getLogger
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse

from app.core.exceptions import DBXAppError
from app.core.responses import ApiErrorResponse

logger = getLogger("app.errors")


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DBXAppError)
    async def handle_dbx_error(request: Request, exc: DBXAppError) -> ORJSONResponse:
        payload = ApiErrorResponse(
            code=exc.code,
            message=exc.message,
            details=exc.details,
            request_id=_request_id(request),
            path=str(request.url.path),
        )
        return ORJSONResponse(status_code=exc.status_code, content=payload.model_dump())

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> ORJSONResponse:
        payload = ApiErrorResponse(
            code="REQUEST_VALIDATION_FAILED",
            message="Request validation failed",
            details={"errors": exc.errors()},
            request_id=_request_id(request),
            path=str(request.url.path),
        )
        return ORJSONResponse(status_code=422, content=payload.model_dump())

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request,
        exc: Exception,
    ) -> ORJSONResponse:
        logger.error(
            "Unhandled exception",
            extra={
                "request_id": _request_id(request),
                "path": str(request.url.path),
                "method": request.method,
                "traceback": traceback.format_exc(),
            },
        )
        payload = ApiErrorResponse(
            code="INTERNAL_SERVER_ERROR",
            message="Internal server error",
            details=None,
            request_id=_request_id(request),
            path=str(request.url.path),
        )
        return ORJSONResponse(status_code=500, content=payload.model_dump())
