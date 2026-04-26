from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("dbaronx.fastapi.errors")


def request_id_from(request: Request) -> str:
    return (
        getattr(request.state, "request_id", "")
        or request.headers.get("x-request-id", "")
        or "unknown"
    )


def production_mode() -> bool:
    import os

    return (
        os.getenv("APP_ENV")
        or os.getenv("ENVIRONMENT")
        or os.getenv("NODE_ENV")
        or "development"
    ).lower() == "production"


def error_payload(
    *,
    request: Request,
    code: str,
    message: str,
    status_code: int,
    details: Any = None,
) -> dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
        "meta": {
            "requestId": request_id_from(request),
            "path": request.url.path,
            "method": request.method,
        },
    }


def register_core_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_payload(
                request=request,
                code="REQUEST_VALIDATION_ERROR",
                message="Request validation failed.",
                status_code=422,
                details=exc.errors(),
            ),
        )

    @app.exception_handler(HTTPException)
    async def handle_http_exception(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        detail = exc.detail

        if isinstance(detail, dict):
            code = str(detail.get("code", "HTTP_EXCEPTION"))
            message = str(detail.get("message", detail.get("detail", "Request failed.")))
            details = detail.get("details")
        else:
            code = "HTTP_EXCEPTION"
            message = str(detail or "Request failed.")
            details = None

        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(
                request=request,
                code=code,
                message=message,
                status_code=exc.status_code,
                details=details,
            ),
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        request_id = request_id_from(request)

        logger.exception(
            "Unhandled FastAPI error request_id=%s path=%s method=%s",
            request_id,
            request.url.path,
            request.method,
        )

        return JSONResponse(
            status_code=500,
            content=error_payload(
                request=request,
                code="INTERNAL_SERVER_ERROR",
                message="Internal server error.",
                status_code=500,
                details=None
                if production_mode()
                else {
                    "type": exc.__class__.__name__,
                    "message": str(exc),
                },
            ),
        )