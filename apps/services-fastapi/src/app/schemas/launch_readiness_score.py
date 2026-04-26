from __future__ import annotations

from pydantic import BaseModel


class LaunchReadinessScoreResponse(BaseModel):
    success: bool
    launch_readiness_score: dict
