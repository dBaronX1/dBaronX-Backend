from __future__ import annotations

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class DbxRequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("x-request-id", "").strip()

        if not request_id or len(request_id) > 128:
            request_id = f"req_{uuid.uuid4().hex}"

        request.state.request_id = request_id
        request.state.started_at = time.perf_counter()
        request.state.service_name = request.headers.get("x-service-name", "").strip()
        request.state.client_ip = self._client_ip(request)
        request.state.user_agent = request.headers.get("user-agent", "").strip()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - request.state.started_at) * 1000, 2)
        response.headers["x-request-id"] = request_id
        response.headers["x-dbx-duration-ms"] = str(duration_ms)

        return response

    def _client_ip(self, request: Request) -> str:
        cf_ip = request.headers.get("cf-connecting-ip", "").strip()
        real_ip = request.headers.get("x-real-ip", "").strip()
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()

        if cf_ip:
            return cf_ip
        if real_ip:
            return real_ip
        if forwarded:
            return forwarded

        return request.client.host if request.client else ""