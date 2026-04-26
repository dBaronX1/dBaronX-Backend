from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class StoryDiscoveryRankingRequest(BaseModel):
    candidates: list[dict[str, Any]] = Field(default_factory=list)


class StoryDiscoveryRankingResponse(BaseModel):
    success: bool
    ranked: list[dict[str, Any]]
