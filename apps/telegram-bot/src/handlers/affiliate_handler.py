from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin
from services.nestjs_client import NestJsClient


class AffiliateHandlerService:
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
        payload = await self.nestjs.get_system_admin_pack(actor_id=actor.telegram_user_id)
        summary = payload.get("platformAdminPack", {}).get("summary", {})
        payouts = summary.get("payouts", {})

        lines = [
            "Affiliate Ops",
            f"Total payout requests: {payouts.get('totalPayoutRequests', 0)}",
            f"Status counts: {payouts.get('statusCounts', {})}",
            "",
            "Primary review queue:",
            "/payout_queue",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def payout_help(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        lines = [
            "Affiliate Payout Controls",
            "/payout_queue",
            "/payout_approve <payout_request_id>",
            "/payout_reject <payout_request_id> [reason]",
            "/payout_settle <payout_request_id> [external_reference]",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


affiliate_handler_service = AffiliateHandlerService()


async def affiliate_ops_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await affiliate_handler_service.overview(update, context)


async def affiliate_payout_help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await affiliate_handler_service.payout_help(update, context)
