from __future__ import annotations

from services.telegram_command_manifest_service import TelegramCommandManifestService
from services.telegram_surface_closure_service import TelegramSurfaceClosureService


class TelegramHandoffPackService:
    def __init__(self) -> None:
        self.manifest = TelegramCommandManifestService()
        self.closure = TelegramSurfaceClosureService()

    def build(self) -> dict:
        return {
            "success": True,
            "telegram_handoff_pack": {
                "manifest": self.manifest.build()["telegram_command_manifest"],
                "closure": self.closure.build()["telegram_surface_closure"],
                "next_subsystem": "frontend_launch_surfaces",
            },
        }
