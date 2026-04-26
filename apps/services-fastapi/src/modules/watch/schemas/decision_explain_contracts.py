from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from apps.services_fastapi.src.modules.watch.schemas.session_validation_contracts import (
    ValidationDecision,
    WatchSessionAggregate,
)


class ExplainDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    aggregate: WatchSessionAggregate


class ExplainDecisionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool = True
    decision: ValidationDecision
    explanation: dict[str, Any]
