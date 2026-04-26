from __future__ import annotations

from pydantic import BaseModel


class DeploymentChecklistResponse(BaseModel):
    success: bool
    deployment_checklist: dict
