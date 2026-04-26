from __future__ import annotations

from pydantic import BaseModel


class W2ECampaignReadinessResponse(BaseModel):
    success: bool
    w2e_campaign_readiness: dict
