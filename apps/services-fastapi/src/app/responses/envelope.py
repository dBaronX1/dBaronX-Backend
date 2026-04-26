from __future__ import annotations

import time
from typing import Any


def utc_timestamp() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def success_response(
    *,
    data: Any = None,
    message: str | None = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "success": True,
        "message": message,
        "data": data,
        "meta": meta or {},
        "timestamp": utc_timestamp(),
    }


def error_response(
    *,
    code: str,
    message: str,
    details: Any = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
        "meta": meta or {},
        "timestamp": utc_timestamp(),
    }