from __future__ import annotations

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security.request_identity import RequestIdentityBuilder


class RequestIdentityMiddleware(BaseHTTPMiddleware):
    """
    Canonical request identity middleware.

    Responsibilities:
    - attach request_id
    - attach request start timestamp
    - attach normalized request identity
    - preserve low-bandwidth, cross-system traceability
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        start = time.perf_counter()

        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        headers = {
            "x-request-id": request_id,
            "x-caller-service": request.headers.get("x-caller-service"),
            "x-caller-surface": request.headers.get("x-caller-surface"),
            "x-actor-id": request.headers.get("x-actor-id"),
            "x-forwarded-for": request.headers.get("x-forwarded-for"),
            "user-agent": request.headers.get("user-agent"),
        }

        request.state.request_id = request_id
        request.state.request_started_at = start
        request.state.request_identity = RequestIdentityBuilder().build(
            headers,
            internal=False,
        )

        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        response.headers["x-request-id"] = request_id
        response.headers["x-response-time-ms"] = str(duration_ms)

        return response
