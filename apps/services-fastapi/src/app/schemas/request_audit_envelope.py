from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class RequestAuditEnvelopeRequest(BaseModel):
    route_path: str = Field(..., min_length=1, max_length=300)
    method: str = Field(..., min_length=1, max_length=20)
    payload_summary: dict | None = None
    response_summary: dict | None = None
    tags: list[str] | None = Field(default=None, max_length=50)

    @field_validator("route_path", "method")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value is required")
        return cleaned

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized: list[str] = []
        for index, item in enumerate(value):
            cleaned = item.strip()
            if not cleaned:
                raise ValueError(f"tags[{index}] is empty")
            normalized.append(cleaned)
        return normalized


class RequestAuditEnvelopeResponse(BaseModel):
    success: bool
    request_audit_envelope: dict
