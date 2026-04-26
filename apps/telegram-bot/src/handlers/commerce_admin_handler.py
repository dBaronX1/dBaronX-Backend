from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


class CommerceAdminHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()

    async def admin(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_system_admin_pack(actor_id=actor.telegram_user_id)
        commerce = payload.get("platformAdminPack", {}).get("summary", {}).get("commerce", {})

        settlement_totals = commerce.get("settlementTotals", {})
        lines = [
            "Commerce Admin",
            f"Order Sync: {commerce.get('orderSyncCount', 0)}",
            f"Product Sync: {commerce.get('productSyncCount', 0)}",
            f"Variant Sync: {commerce.get('variantSyncCount', 0)}",
            f"Fulfillment Sync: {commerce.get('fulfillmentSyncCount', 0)}",
            f"Settlements: {commerce.get('settlementCount', 0)}",
            f"Gross: {settlement_totals.get('gross', 0)}",
            f"Merchant Net: {settlement_totals.get('merchantNet', 0)}",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


commerce_admin_handler_service = CommerceAdminHandlerService()


async def commerce_admin_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await commerce_admin_handler_service.admin(update, context)
