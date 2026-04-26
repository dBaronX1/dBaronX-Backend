from __future__ import annotations

from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        response.headers.setdefault("x-content-type-options", "nosniff")
        response.headers.setdefault("x-frame-options", "DENY")
        response.headers.setdefault("referrer-policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("x-dns-prefetch-control", "off")
        response.headers.setdefault("cross-origin-opener-policy", "same-origin")
        response.headers.setdefault("cross-origin-resource-policy", "same-site")
        response.headers.setdefault(
            "permissions-policy",
            "camera=(), microphone=(), geolocation=(), payment=(self), fullscreen=(self)",
        )

        proto = request.headers.get("x-forwarded-proto", "").lower()
        if request.url.scheme == "https" or proto == "https":
            response.headers.setdefault(
                "strict-transport-security",
                "max-age=31536000; includeSubDomains; preload",
            )

        return response