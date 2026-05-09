from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from formatters.admin_formatters import format_review_queue
from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


def _blocked_write_message(action: str) -> str:
    return "\n".join(
        [
            f"⚠️ /{action} intentionally blocked in Telegram phase 16",
            "Telegram is read-only diagnostics/control for payouts in this phase.",
            "Unsafe actions blocked: approve payouts, settle payouts, credit wallets, fulfill orders.",
            "Next action: use backend/admin workflow with full audit and proof, not Telegram.",
        ]
    )


class PayoutsHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()

    async def queue(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_payout_review_queue(
            actor_id=actor.telegram_user_id
        )
        data = payload.get("data", payload)
        text = format_review_queue(
            "Payout Review Queue",
            data.get("payoutReviewQueue", {}).get("queue", []),
        )

        if update.effective_message:
            await update.effective_message.reply_text(text + "\nNext action: review only; approvals are blocked from Telegram.")

    async def approve(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return
        if update.effective_message:
            await update.effective_message.reply_text(_blocked_write_message("payout_approve"))

    async def reject(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return
        if update.effective_message:
            await update.effective_message.reply_text(_blocked_write_message("payout_reject"))

    async def settle(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return
        if update.effective_message:
            await update.effective_message.reply_text(_blocked_write_message("payout_settle"))


payouts_handler_service = PayoutsHandlerService()


async def payout_queue_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payouts_handler_service.queue(update, context)


async def payout_approve_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payouts_handler_service.approve(update, context)


async def payout_reject_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payouts_handler_service.reject(update, context)


async def payout_settle_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payouts_handler_service.settle(update, context)
