from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


class PaymentsHandlerService:
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
        payments = summary.get("payments", {})

        totals = payments.get("settlementTotals", {})
        lines = [
            "Payments Admin",
            f"Preflight Traces: {payments.get('preflightTraceCount', 0)}",
            f"Checkout Settlements: {payments.get('checkoutSettlementCount', 0)}",
            f"Gross: {totals.get('gross', 0)}",
            f"Net: {totals.get('net', 0)}",
            f"Tax: {totals.get('tax', 0)}",
            f"Shipping: {totals.get('shipping', 0)}",
            f"Discount: {totals.get('discount', 0)}",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def settlement_help(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        lines = [
            "Payments Settlement Ops",
            "Authoritative internal endpoints:",
            "/api/v1/payments/orchestration/preflight",
            "/api/v1/payments/checkout-settlement",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


payments_handler_service = PaymentsHandlerService()


async def payments_ops_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await payments_handler_service.overview(update, context)


async def payments_settlement_help_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    await payments_handler_service.settlement_help(update, context)
