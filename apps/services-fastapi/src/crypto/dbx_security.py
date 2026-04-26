from __future__ import annotations

import hmac
import os
from typing import Optional

from fastapi import Header, HTTPException, status


def _environment() -> str:
    return (
        os.getenv("APP_ENV")
        or os.getenv("ENVIRONMENT")
        or os.getenv("NODE_ENV")
        or "development"
    ).strip().lower()


def _internal_token() -> str:
    return (
        os.getenv("INTERNAL_SERVICE_TOKEN")
        or os.getenv("FASTAPI_INTERNAL_SERVICE_TOKEN")
        or ""
    ).strip()


def require_internal_service_token(
    x_internal_service_token: Optional[str] = Header(default=None),
    x_service_token: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
) -> dict[str, str]:
    expected = _internal_token()

    if not expected:
        if _environment() == "production":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "code": "INTERNAL_TOKEN_NOT_CONFIGURED",
                    "message": "Internal service token is not configured.",
                },
            )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "INTERNAL_TOKEN_NOT_CONFIGURED",
                "message": "Internal service token is required even outside production.",
            },
        )

    provided = (x_internal_service_token or x_service_token or "").strip()

    if not provided and authorization:
        prefix = "Bearer "
        if authorization.startswith(prefix):
            provided = authorization[len(prefix) :].strip()

    if not provided:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INTERNAL_TOKEN_MISSING",
                "message": "Missing internal service token.",
            },
        )

    if not hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INTERNAL_TOKEN_INVALID",
                "message": "Invalid internal service token.",
            },
        )

    return {
        "authenticated": "true",
        "source": "internal-service",
    }
