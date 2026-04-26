from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DBXBaseModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )


class PaginationMeta(DBXBaseModel):
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=200)
    total: int = Field(ge=0)
    has_next: bool
    has_previous: bool


class ServiceDependencyHealth(DBXBaseModel):
    ok: bool
    source: str
    latency_ms: float | None = None
    error: str | None = None
    details: dict[str, Any] | None = None


class SuccessEnvelope(DBXBaseModel, Generic[T]):
    success: bool = True
    message: str = "Success"
    data: T | None = None
    request_id: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)


class ErrorEnvelope(DBXBaseModel):
    success: bool = False
    code: str
    message: str
    details: dict[str, Any] | list[Any] | None = None
    request_id: str | None = None
    path: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)


class InternalActor(DBXBaseModel):
    service: str | None = None
    actor_id: str | None = None
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


class GeoSummary(DBXBaseModel):
    ip: str | None = None
    country: str | None = None
    region: str | None = None
    city: str | None = None
    timezone: str | None = None
    is_proxy_suspected: bool = False
    is_vpn_suspected: bool = False


class DeviceSummary(DBXBaseModel):
    fingerprint: str | None = None
    platform: str | None = None
    browser: str | None = None
    browser_version: str | None = None
    os: str | None = None
    os_version: str | None = None
    device_type: str | None = None
    is_mobile: bool = False
    is_bot_like: bool = False
