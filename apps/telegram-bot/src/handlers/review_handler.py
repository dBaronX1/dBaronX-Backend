from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from formatters.admin_formatters import format_review_queue
from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


class ReviewHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()

    async def ads_queue(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_ads_review_queue(actor_id=actor.telegram_user_id)
        text = format_review_queue(
            "Ads Review Queue",
            payload.get("campaignReviewQueue", {}).get("queue", []),
        )

        if update.effective_message:
            await update.effective_message.reply_text(text)

    async def ai_queue(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_ai_story_review_queue(
            actor_id=actor.telegram_user_id
        )
        text = format_review_queue(
            "AI Story Review Queue",
            payload.get("aiStoryCampaignReviewQueue", {}).get("queue", []),
        )

        if update.effective_message:
            await update.effective_message.reply_text(text)

    async def suppliers(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_supplier_admin_dashboard(
            actor_id=actor.telegram_user_id
        )
        admin = payload.get("supplierAdmin", {})

        lines = [
            "Supplier Ops",
            f"Total Orders: {admin.get('totalOrders', 0)}",
            f"Status Counts: {admin.get('statusCounts', {})}",
            f"Settlement Counts: {admin.get('settlementCounts', {})}",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


review_handler_service = ReviewHandlerService()


async def ads_queue_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await review_handler_service.ads_queue(update, context)


async def ai_review_queue_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await review_handler_service.ai_queue(update, context)


async def suppliers_ops_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await review_handler_service.suppliers(update, context)
