from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


class WalletHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()

    async def overview(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        pack = await self.nestjs.get_system_admin_pack(actor_id=actor.telegram_user_id)
        summary = pack.get("platformAdminPack", {}).get("summary", {})
        wallet = summary.get("wallet", {})

        totals = wallet.get("totals", {})
        lines = [
            "Wallet Admin",
            f"Wallet Count: {wallet.get('walletCount', 0)}",
            f"Hold Count: {wallet.get('holdCount', 0)}",
            f"Ledger Entries: {wallet.get('ledgerEntryCount', 0)}",
            f"Available: {totals.get('available', 0)}",
            f"Locked: {totals.get('locked', 0)}",
            f"Pending: {totals.get('pending', 0)}",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def hold_help(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        lines = [
            "Wallet Hold/Release/Settlement Ops",
            "Authoritative internal endpoints:",
            "/api/v1/wallet/orchestration/hold",
            "/api/v1/wallet/orchestration/release",
            "/api/v1/wallet/orchestration/settlement",
            "",
            "Telegram direct mutation commands can be added after validation phase.",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


wallet_handler_service = WalletHandlerService()


async def wallet_ops_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await wallet_handler_service.overview(update, context)


async def wallet_hold_help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await wallet_handler_service.hold_help(update, context)
