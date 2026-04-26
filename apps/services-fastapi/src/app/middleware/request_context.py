from __future__ import annotations

import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex}"
        started_at = time.perf_counter()

        request.state.request_id = request_id
        request.state.started_at = started_at
        request.state.client_ip = self._extract_ip(request)
        request.state.user_agent = request.headers.get("user-agent", "")

        response: Response = await call_next(request)

        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        response.headers["x-request-id"] = request_id
        response.headers["x-response-time-ms"] = str(duration_ms)
        response.headers["x-service-name"] = "dbaronx-fastapi"

        return response

    @staticmethod
    def _extract_ip(request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for", "").strip()
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        if request.client and request.client.host:
            return request.client.host

        return ""
