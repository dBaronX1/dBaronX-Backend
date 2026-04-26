from __future__ import annotations

from pydantic import BaseModel, Field


class DecisionConsistencyRequest(BaseModel):
    surfaces: dict = Field(...)


class DecisionConsistencyResponse(BaseModel):
    success: bool
    decision_consistency: dict
