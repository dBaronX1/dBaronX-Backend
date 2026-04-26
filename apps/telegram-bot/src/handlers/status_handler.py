from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.telegram_status_service import TelegramStatusService
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


status_service = TelegramStatusService()


async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return

    actor = build_actor_context(update)
    payload = await status_service.full_status(actor_id=actor.telegram_user_id)

    lines = [
        "System Status",
        f"Launch Ready: {'YES' if payload['launch_ready'] else 'NO'}",
        f"FastAPI Closed: {'YES' if payload['fastapi_closed'] else 'NO'}",
        f"Launch Blockers: {len(payload['launch_blockers'])}",
        f"FastAPI Blockers: {len(payload['fastapi_blockers'])}",
    ]

    if update.effective_message:
        await update.effective_message.reply_text("\n".join(lines))
