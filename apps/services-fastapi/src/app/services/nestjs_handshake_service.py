from __future__ import annotations

from typing import Any

from app.services.decision_bundle_manifest_service import (
    DecisionBundleManifestService,
)
from app.services.intelligence_bootstrap_manifest_service import (
    IntelligenceBootstrapManifestService,
)
from app.services.intelligence_capability_service import (
    IntelligenceCapabilityService,
)
from app.services.intelligence_startup_gate_service import (
    IntelligenceStartupGateService,
)


class NestJsHandshakeService:
    """
    Canonical FastAPI -> NestJS handshake payload.

    NestJS can call this endpoint during startup to validate that
    intelligence surfaces, bundles, and gates are stable enough for
    economic orchestration.
    """

    def __init__(
        self,
        *,
        capability_service: IntelligenceCapabilityService | None = None,
        bootstrap_manifest_service: IntelligenceBootstrapManifestService | None = None,
        startup_gate_service: IntelligenceStartupGateService | None = None,
        decision_bundle_manifest_service: DecisionBundleManifestService | None = None,
    ) -> None:
        self.capability_service = capability_service or IntelligenceCapabilityService()
        self.bootstrap_manifest_service = (
            bootstrap_manifest_service or IntelligenceBootstrapManifestService()
        )
        self.startup_gate_service = (
            startup_gate_service or IntelligenceStartupGateService()
        )
        self.decision_bundle_manifest_service = (
            decision_bundle_manifest_service or DecisionBundleManifestService()
        )

    def build(self) -> dict[str, Any]:
        capabilities = self.capability_service.build()["capabilities"]
        bootstrap_manifest = self.bootstrap_manifest_service.build()[
            "intelligence_bootstrap_manifest"
        ]
        startup_gate = self.startup_gate_service.build()["intelligence_startup_gate"]
        bundle_manifest = self.decision_bundle_manifest_service.build()[
            "decision_bundle_manifest"
        ]

        return {
            "success": True,
            "nestjs_handshake": {
                "compatible": startup_gate["startup_allowed"],
                "version": "1.0.0",
                "capabilities": capabilities,
                "bootstrap_manifest": bootstrap_manifest,
                "startup_gate": {
                    "status": startup_gate["status"],
                    "blockers": startup_gate["blockers"],
                },
                "decision_bundle_manifest": bundle_manifest,
            },
        }
