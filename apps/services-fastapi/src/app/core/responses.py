from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ApiSuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Success"
    data: T | None = None
    timestamp: str = Field(default_factory=utc_now_iso)
    request_id: str | None = None


class ApiErrorResponse(BaseModel):
    success: bool = False
    code: str
    message: str
    details: dict[str, Any] | list[Any] | None = None
    timestamp: str = Field(default_factory=utc_now_iso)
    request_id: str | None = None
    path: str | None = None
