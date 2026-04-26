from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class DecisionBundleRequest(BaseModel):
    bundle_type: str = Field(..., min_length=1, max_length=80)
    payload: dict = Field(...)

    @field_validator("bundle_type")
    @classmethod
    def normalize_bundle_type(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("bundle_type is required")
        return cleaned


class DecisionBundleResponse(BaseModel):
    success: bool
    decision_bundle: dict
