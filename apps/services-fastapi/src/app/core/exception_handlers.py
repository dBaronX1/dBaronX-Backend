from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("dbaronx.fastapi.exceptions")


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def fastapi_http_exception_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.detail if isinstance(exc.detail, str) else "request failed",
                "details": exc.detail if isinstance(exc.detail, dict) else None,
                "request_id": _request_id(request),
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.detail,
                "request_id": _request_id(request),
            },
        )

    @app.exception_handler(ValidationError)
    async def pydantic_validation_exception_handler(
        request: Request,
        exc: ValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "validation failed",
                "errors": exc.errors(),
                "request_id": _request_id(request),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception(
            "Unhandled exception on path=%s request_id=%s",
            request.url.path,
            _request_id(request),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "internal server error",
                "request_id": _request_id(request),
            },
        )
