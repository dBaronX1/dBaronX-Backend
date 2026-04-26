from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class DbxVerificationTraceResponse(BaseModel):
    success: bool
    requestId: str
    reference: str
    signature: str
    statusFound: bool
    transactionFound: bool
    candidateCount: int = Field(..., ge=0)
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    status: dict[str, Any] = Field(default_factory=dict)


class DbxRouteMountInfo(BaseModel):
    module: str
    prefix: str
    tags: list[str]
    required: bool


class DbxRouteRegistryResponse(BaseModel):
    success: bool
    routes: list[DbxRouteMountInfo]