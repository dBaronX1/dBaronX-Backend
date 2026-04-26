from __future__ import annotations


class TelegramCommandManifestService:
    def build(self) -> dict:
        return {
            "success": True,
            "telegram_command_manifest": {
                "general": [
                    "/start",
                    "/help",
                ],
                "ops": [
                    "/admin",
                    "/ops",
                    "/status",
                    "/ops_pack",
                    "/admin_summary",
                    "/launch_audit",
                    "/platform_shell",
                ],
                "system": [
                    "/launch",
                    "/readiness",
                    "/fastapi",
                    "/fastapi_handoff_pack",
                    "/fastapi_route_matrix",
                    "/fastapi_enforcement",
                    "/platform_pack",
                    "/admin_action_pack",
                    "/admin_recheck_help",
                ],
                "wallet_payments_payouts": [
                    "/wallet_ops",
                    "/wallet_hold_help",
                    "/payments_ops",
                    "/payments_settlement_help",
                    "/payout_queue",
                    "/payout_approve <id>",
                    "/payout_reject <id> [reason]",
                    "/payout_settle <id> [external_ref]",
                ],
                "affiliate_watch_ai": [
                    "/affiliate_ops",
                    "/affiliate_payout_help",
                    "/watch_ops",
                    "/watch_reward_help",
                    "/ai_stories_ops",
                    "/ai_stories_distribution_help",
                    "/ai_queue",
                ],
                "commerce_suppliers_ads": [
                    "/commerce_ops",
                    "/commerce_admin",
                    "/commerce_reconciliation_help",
                    "/suppliers_ops",
                    "/ads_queue",
                ],
            },
        }
