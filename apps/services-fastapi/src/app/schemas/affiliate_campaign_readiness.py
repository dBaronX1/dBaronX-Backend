from __future__ import annotations

from pydantic import BaseModel


class AffiliateCampaignReadinessResponse(BaseModel):
    success: bool
    affiliate_campaign_readiness: dict
