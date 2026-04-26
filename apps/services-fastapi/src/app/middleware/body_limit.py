from __future__ import annotations

import os
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class BodyLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_length = request.headers.get("content-length")
        limit = self._limit_for_path(request.url.path)

        request.state.body_limit_bytes = limit

        if content_length:
            try:
                parsed = int(content_length)
            except ValueError:
                return self._reject(request, 400, "INVALID_CONTENT_LENGTH", "Invalid Content-Length header")

            if parsed < 0:
                return self._reject(request, 400, "INVALID_CONTENT_LENGTH", "Invalid Content-Length header")

            if parsed > limit:
                return self._reject(
                    request,
                    413,
                    "PAYLOAD_TOO_LARGE",
                    f"Payload exceeds {limit} bytes",
                    {"contentLength": parsed, "maxBytes": limit},
                )

        return await call_next(request)

    def _limit_for_path(self, path: str) -> int:
        lower = path.lower()

        if "/upload" in lower or "/files" in lower:
            return self._env_int("MAX_UPLOAD_BODY_BYTES", 12 * 1024 * 1024)

        if "webhook" in lower:
            return self._env_int("MAX_WEBHOOK_BODY_BYTES", 2 * 1024 * 1024)

        return self._env_int("MAX_BODY_BYTES", 2 * 1024 * 1024)

    def _env_int(self, key: str, default: int) -> int:
        try:
            value = int(os.getenv(key, str(default)))
            return value if value > 0 else default
        except ValueError:
            return default

    def _reject(
        self,
        request: Request,
        status_code: int,
        code: str,
        message: str,
        details: dict | None = None,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "error": {
                    "code": code,
                    "message": message,
                    "details": details or {},
                },
                "meta": {
                    "requestId": getattr(request.state, "request_id", "")
                    or request.headers.get("x-request-id", ""),
                    "path": request.url.path,
                    "method": request.method,
                },
            },
        )