from __future__ import annotations

from services.telegram_command_manifest_service import TelegramCommandManifestService


class TelegramSurfaceClosureService:
    def __init__(self) -> None:
        self.manifest = TelegramCommandManifestService()

    def build(self) -> dict:
        manifest = self.manifest.build()["telegram_command_manifest"]

        required_sections = [
            "ops",
            "system",
            "wallet_payments_payouts",
            "affiliate_watch_ai",
            "commerce_suppliers_ads",
        ]

        missing_sections = [
            section for section in required_sections if section not in manifest
        ]

        return {
            "success": True,
            "telegram_surface_closure": {
                "closed": len(missing_sections) == 0,
                "missing_sections": missing_sections,
                "section_count": len(manifest),
                "next_subsystem": "frontend_launch_surfaces",
            },
        }
