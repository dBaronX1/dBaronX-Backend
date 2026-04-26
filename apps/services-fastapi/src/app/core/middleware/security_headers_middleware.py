from __future__ import annotations

from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Canonical security and runtime headers middleware.

    Lightweight, mobile-safe, and suitable for API-only services.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        response = await call_next(request)

        response.headers.setdefault("x-service-name", "dbaronx-fastapi-intelligence")
        response.headers.setdefault("x-frame-options", "DENY")
        response.headers.setdefault("x-content-type-options", "nosniff")
        response.headers.setdefault("referrer-policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("cache-control", "no-store")

        return response
