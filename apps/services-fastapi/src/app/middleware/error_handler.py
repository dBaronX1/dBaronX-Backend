from __future__ import annotations

from fastapi import Request
from fastapi.responses import ORJSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger

logger = get_logger("app.error_handler")


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            request_id = getattr(request.state, "request_id", None)

            logger.exception(
                "Unhandled middleware exception",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(exc),
                },
            )

            return ORJSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Internal server error",
                    "error": {
                        "type": exc.__class__.__name__,
                        "message": str(exc),
                    },
                    "request_id": request_id,
                },
            )
