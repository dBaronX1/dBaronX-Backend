from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from formatters.admin_formatters import (
    format_fastapi_closure,
    format_launch_closure,
    format_readiness_matrix,
    format_review_queue,
)
from keyboards.admin_keyboards import admin_home_keyboard
from services.fastapi_client import FastApiClient
from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


class AdminHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()
        self.fastapi = FastApiClient()

    async def handle_home(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return
        if update.effective_message:
            await update.effective_message.reply_text(
                "Admin control surface",
                reply_markup=admin_home_keyboard(),
            )

    async def handle_callback(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        query = update.callback_query
        if not query:
            return

        actor = build_actor_context(update)
        await query.answer()

        if query.data == "admin:launch":
            payload = await self.nestjs.get_launch_closure(actor_id=actor.telegram_user_id)
            text = format_launch_closure(payload)
        elif query.data == "admin:readiness":
            payload = await self.nestjs.get_readiness_matrix(actor_id=actor.telegram_user_id)
            text = format_readiness_matrix(payload)
        elif query.data == "admin:payout_queue":
            payload = await self.nestjs.get_payout_review_queue(actor_id=actor.telegram_user_id)
            text = format_review_queue(
                "Payout Review Queue",
                payload.get("payoutReviewQueue", {}).get("queue", []),
            )
        elif query.data == "admin:ads_queue":
            payload = await self.nestjs.get_ads_review_queue(actor_id=actor.telegram_user_id)
            text = format_review_queue(
                "Ads Review Queue",
                payload.get("campaignReviewQueue", {}).get("queue", []),
            )
        elif query.data == "admin:ai_queue":
            payload = await self.nestjs.get_ai_story_review_queue(actor_id=actor.telegram_user_id)
            text = format_review_queue(
                "AI Story Review Queue",
                payload.get("aiStoryCampaignReviewQueue", {}).get("queue", []),
            )
        elif query.data == "admin:suppliers":
            payload = await self.nestjs.get_supplier_admin_dashboard(actor_id=actor.telegram_user_id)
            admin = payload.get("supplierAdmin", {})
            text = "\n".join(
                [
                    "Supplier Admin",
                    f"Total Orders: {admin.get('totalOrders', 0)}",
                    f"Status Counts: {admin.get('statusCounts', {})}",
                    f"Settlement Counts: {admin.get('settlementCounts', {})}",
                ]
            )
        elif query.data == "admin:fastapi":
            payload = await self.fastapi.get_final_fastapi_subsystem_closure(
                actor_id=actor.telegram_user_id
            )
            text = format_fastapi_closure(payload)
        else:
            text = "Unknown admin action."

        await query.edit_message_text(text=text, reply_markup=admin_home_keyboard())


admin_handler_service = AdminHandlerService()


async def admin_home_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await admin_handler_service.handle_home(update, context)


async def admin_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await admin_handler_service.handle_callback(update, context)
