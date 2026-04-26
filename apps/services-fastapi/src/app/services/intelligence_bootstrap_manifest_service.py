from __future__ import annotations

from typing import Any

from app.services.affiliate_campaign_readiness_service import (
    AffiliateCampaignReadinessService,
)
from app.services.intelligence_health_service import IntelligenceHealthService
from app.services.payment_intelligence_readiness_service import (
    PaymentIntelligenceReadinessService,
)
from app.services.story_promotion_readiness_service import (
    StoryPromotionReadinessService,
)
from app.services.w2e_campaign_readiness_service import W2ECampaignReadinessService


class IntelligenceBootstrapManifestService:
    """
    Canonical bootstrap manifest for NestJS/FastAPI handshake.

    Intended to be called by the economic brain at startup or periodically.
    It provides one compact response proving whether the FastAPI intelligence
    layer is sufficiently ready across revenue-critical subsystem surfaces.
    """

    def __init__(
        self,
        *,
        intelligence_health_service: IntelligenceHealthService | None = None,
        w2e_campaign_readiness_service: W2ECampaignReadinessService | None = None,
        affiliate_campaign_readiness_service: AffiliateCampaignReadinessService | None = None,
        payment_intelligence_readiness_service: PaymentIntelligenceReadinessService | None = None,
        story_promotion_readiness_service: StoryPromotionReadinessService | None = None,
    ) -> None:
        self.intelligence_health_service = (
            intelligence_health_service or IntelligenceHealthService()
        )
        self.w2e_campaign_readiness_service = (
            w2e_campaign_readiness_service or W2ECampaignReadinessService()
        )
        self.affiliate_campaign_readiness_service = (
            affiliate_campaign_readiness_service or AffiliateCampaignReadinessService()
        )
        self.payment_intelligence_readiness_service = (
            payment_intelligence_readiness_service or PaymentIntelligenceReadinessService()
        )
        self.story_promotion_readiness_service = (
            story_promotion_readiness_service or StoryPromotionReadinessService()
        )

    def build(self) -> dict[str, Any]:
        health = self.intelligence_health_service.build()["intelligence_health"]
        w2e = self.w2e_campaign_readiness_service.build()["w2e_campaign_readiness"]
        affiliate = self.affiliate_campaign_readiness_service.build()[
            "affiliate_campaign_readiness"
        ]
        payments = self.payment_intelligence_readiness_service.build()[
            "payment_intelligence_readiness"
        ]
        stories = self.story_promotion_readiness_service.build()[
            "story_promotion_readiness"
        ]

        bootstrap_ready = (
            health["status"] == "ready"
            and w2e["ready"] is True
            and affiliate["ready"] is True
            and payments["ready"] is True
            and stories["ready"] is True
        )

        return {
            "success": True,
            "intelligence_bootstrap_manifest": {
                "bootstrap_ready": bootstrap_ready,
                "health_status": health["status"],
                "subsystems": {
                    "watch_to_earn": w2e,
                    "affiliate": affiliate,
                    "payments": payments,
                    "ai_story_promotion": stories,
                },
            },
        }
