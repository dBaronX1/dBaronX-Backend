from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin
from services.nestjs_client import NestJsClient


class CommerceHandlerService:
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
        commerce = summary.get("commerce", {})

        lines = [
            "Commerce Ops",
            f"Order sync count: {commerce.get('orderSyncCount', 0)}",
            f"Product sync count: {commerce.get('productSyncCount', 0)}",
            f"Variant sync count: {commerce.get('variantSyncCount', 0)}",
            f"Fulfillment sync count: {commerce.get('fulfillmentSyncCount', 0)}",
            f"Settlement count: {commerce.get('settlementCount', 0)}",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def reconciliation_help(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        lines = [
            "Commerce Reconciliation Ops",
            "Core internal endpoints:",
            "/api/v1/commerce/reconciliation/orders/:medusaOrderId",
            "/api/v1/commerce/fulfillment/:medusaOrderId/sync",
            "/api/v1/commerce/fulfillment/:medusaOrderId/provider-normalization",
            "/api/v1/commerce/settlements",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


commerce_handler_service = CommerceHandlerService()


async def commerce_ops_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await commerce_handler_service.overview(update, context)


async def commerce_reconciliation_help_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    await commerce_handler_service.reconciliation_help(update, context)
