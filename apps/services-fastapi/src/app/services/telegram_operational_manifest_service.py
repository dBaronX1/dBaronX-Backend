from __future__ import annotations

from typing import Any

from app.services.intelligence_health_service import IntelligenceHealthService
from app.services.system_decision_manifest_service import (
    SystemDecisionManifestService,
)


class TelegramOperationalManifestService:
    """
    Canonical Telegram control-surface manifest.

    Gives the Telegram bot a compact map of:
    - whether the intelligence layer is healthy enough
    - which critical surfaces are available for user/admin commands
    """

    def __init__(
        self,
        *,
        intelligence_health_service: IntelligenceHealthService | None = None,
        system_decision_manifest_service: SystemDecisionManifestService | None = None,
    ) -> None:
        self.intelligence_health_service = (
            intelligence_health_service or IntelligenceHealthService()
        )
        self.system_decision_manifest_service = (
            system_decision_manifest_service or SystemDecisionManifestService()
        )

    def build(self) -> dict[str, Any]:
        intelligence_health = self.intelligence_health_service.build()[
            "intelligence_health"
        ]
        decision_manifest = self.system_decision_manifest_service.build()["manifest"]

        bot_surfaces = {
            "w2e_admin_check": "/w2e-campaign-readiness/snapshot",
            "affiliate_admin_check": "/affiliate-campaign-readiness/snapshot",
            "payment_admin_check": "/payment-intelligence-readiness/snapshot",
            "story_admin_check": "/story-promotion-readiness/snapshot",
            "intelligence_health": "/intelligence-health/snapshot",
        }

        return {
            "success": True,
            "telegram_operational_manifest": {
                "ready_for_bot_ops": intelligence_health["status"] == "ready",
                "bot_surfaces": bot_surfaces,
                "decision_surface_count": len(
                    decision_manifest.get("decision_surfaces", [])
                ),
                "blockers": intelligence_health["blockers"],
            },
        }
