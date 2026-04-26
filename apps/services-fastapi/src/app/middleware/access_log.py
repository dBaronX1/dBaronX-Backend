from __future__ import annotations

import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger

logger = get_logger("app.access_log")


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started = time.perf_counter()
        request_id = getattr(request.state, "request_id", None)

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - started) * 1000, 2)

        logger.info(
            "http_request_completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query or ""),
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": getattr(request.state, "client_ip", ""),
                "user_agent": getattr(request.state, "user_agent", ""),
            },
        )

        return response
