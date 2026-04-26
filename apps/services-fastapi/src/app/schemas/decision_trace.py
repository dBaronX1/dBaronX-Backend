from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class DecisionTraceRequest(BaseModel):
    flow_type: str = Field(..., min_length=1, max_length=80)
    decision_payload: dict = Field(...)
    request_payload: dict | None = None
    metadata: dict | None = None

    @field_validator("flow_type")
    @classmethod
    def normalize_flow_type(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("flow_type is required")
        return cleaned


class DecisionTraceResponse(BaseModel):
    success: bool
    decision_trace: dict
