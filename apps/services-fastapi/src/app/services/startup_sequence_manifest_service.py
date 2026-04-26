from __future__ import annotations

from typing import Any

from app.services.intelligence_bootstrap_manifest_service import (
    IntelligenceBootstrapManifestService,
)
from app.services.intelligence_startup_gate_service import (
    IntelligenceStartupGateService,
)
from app.services.nestjs_handshake_service import NestJsHandshakeService
from app.services.telegram_operational_manifest_service import (
    TelegramOperationalManifestService,
)


class StartupSequenceManifestService:
    """
    Canonical startup sequence manifest for dBaronX operational boot order.

    This is the bridge from isolated readiness checks to real launch sequence.
    """

    def __init__(
        self,
        *,
        startup_gate_service: IntelligenceStartupGateService | None = None,
        bootstrap_manifest_service: IntelligenceBootstrapManifestService | None = None,
        nestjs_handshake_service: NestJsHandshakeService | None = None,
        telegram_operational_manifest_service: TelegramOperationalManifestService | None = None,
    ) -> None:
        self.startup_gate_service = (
            startup_gate_service or IntelligenceStartupGateService()
        )
        self.bootstrap_manifest_service = (
            bootstrap_manifest_service or IntelligenceBootstrapManifestService()
        )
        self.nestjs_handshake_service = (
            nestjs_handshake_service or NestJsHandshakeService()
        )
        self.telegram_operational_manifest_service = (
            telegram_operational_manifest_service or TelegramOperationalManifestService()
        )

    def build(self) -> dict[str, Any]:
        startup_gate = self.startup_gate_service.build()["intelligence_startup_gate"]
        bootstrap_manifest = self.bootstrap_manifest_service.build()[
            "intelligence_bootstrap_manifest"
        ]
        nestjs_handshake = self.nestjs_handshake_service.build()["nestjs_handshake"]
        telegram_manifest = self.telegram_operational_manifest_service.build()[
            "telegram_operational_manifest"
        ]

        sequence = [
            {
                "step": 1,
                "name": "fastapi_startup_gate",
                "ready": startup_gate["startup_allowed"],
                "required": True,
            },
            {
                "step": 2,
                "name": "fastapi_bootstrap_manifest",
                "ready": bootstrap_manifest["bootstrap_ready"],
                "required": True,
            },
            {
                "step": 3,
                "name": "nestjs_handshake",
                "ready": nestjs_handshake["compatible"],
                "required": True,
            },
            {
                "step": 4,
                "name": "telegram_operational_manifest",
                "ready": telegram_manifest["ready_for_bot_ops"],
                "required": False,
            },
        ]

        blocking_steps = [
            item["name"]
            for item in sequence
            if item["required"] and item["ready"] is not True
        ]

        return {
            "success": True,
            "startup_sequence_manifest": {
                "launch_ready": len(blocking_steps) == 0,
                "blocking_steps": blocking_steps,
                "sequence": sequence,
            },
        }
