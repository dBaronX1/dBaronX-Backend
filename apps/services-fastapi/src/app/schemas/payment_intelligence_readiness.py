from __future__ import annotations

from pydantic import BaseModel


class PaymentIntelligenceReadinessResponse(BaseModel):
    success: bool
    payment_intelligence_readiness: dict
