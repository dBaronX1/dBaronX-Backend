from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from formatters.admin_formatters import format_review_queue
from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


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
        text = format_review_queue(
            "Payout Review Queue",
            payload.get("payoutReviewQueue", {}).get("queue", []),
        )

        if update.effective_message:
            await update.effective_message.reply_text(text)

    async def approve(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        if len(context.args) < 1:
            if update.effective_message:
                await update.effective_message.reply_text(
                    "Usage: /payout_approve <payout_request_id>"
                )
            return

        payout_request_id = context.args[0]
        actor = build_actor_context(update)

        payload = await self.nestjs.approve_payout(
            payout_request_id,
            actor_id=actor.telegram_user_id,
        )
        payout = payload.get("payoutRequest", {})

        if update.effective_message:
            await update.effective_message.reply_text(
                "\n".join(
                    [
                        "Payout Approved",
                        f"ID: {payout.get('id', payout_request_id)}",
                        f"Status: {payout.get('status', 'unknown')}",
                    ]
                )
            )

    async def reject(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        if len(context.args) < 1:
            if update.effective_message:
                await update.effective_message.reply_text(
                    "Usage: /payout_reject <payout_request_id> [reason]"
                )
            return

        payout_request_id = context.args[0]
        reason = " ".join(context.args[1:]).strip() or None
        actor = build_actor_context(update)

        payload = await self.nestjs.reject_payout(
            payout_request_id,
            actor_id=actor.telegram_user_id,
            reason=reason,
        )
        payout = payload.get("payoutRequest", {})

        if update.effective_message:
            await update.effective_message.reply_text(
                "\n".join(
                    [
                        "Payout Rejected",
                        f"ID: {payout.get('id', payout_request_id)}",
                        f"Status: {payout.get('status', 'unknown')}",
                        f"Reason: {reason or 'n/a'}",
                    ]
                )
            )

    async def settle(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        if len(context.args) < 1:
            if update.effective_message:
                await update.effective_message.reply_text(
                    "Usage: /payout_settle <payout_request_id> [external_reference]"
                )
            return

        payout_request_id = context.args[0]
        external_reference = context.args[1] if len(context.args) > 1 else None
        actor = build_actor_context(update)

        payload = await self.nestjs.settle_payout(
            payout_request_id,
            actor_id=actor.telegram_user_id,
            external_reference=external_reference,
        )
        payout = payload.get("payoutRequest", {})

        if update.effective_message:
            await update.effective_message.reply_text(
                "\n".join(
                    [
                        "Payout Settled",
                        f"ID: {payout.get('id', payout_request_id)}",
                        f"Status: {payout.get('status', 'unknown')}",
                        f"External Ref: {external_reference or 'n/a'}",
                    ]
                )
            )


payouts_handler_service = PayoutsHandlerService()


async def payout_queue_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payouts_handler_service.queue(update, context)


async def payout_approve_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payouts_handler_service.approve(update, context)


async def payout_reject_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payouts_handler_service.reject(update, context)


async def payout_settle_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payouts_handler_service.settle(update, context)
