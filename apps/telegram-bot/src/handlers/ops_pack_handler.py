from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.telegram_ops_pack_service import TelegramOpsPackService
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


ops_pack_service = TelegramOpsPackService()


async def ops_pack_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return

    actor = build_actor_context(update)
    payload = await ops_pack_service.build(actor_id=actor.telegram_user_id)

    shell = payload.get("platform_admin_pack", {}).get("shell", {})
    launch = payload.get("launch_closure", {})
    handoff = payload.get("fastapi_handoff_pack", {})

    lines = [
        "Ops Pack",
        f"Platform Ready: {'YES' if shell.get('ready') else 'NO'}",
        f"Launch Ready: {'YES' if launch.get('ready') else 'NO'}",
        f"FastAPI Closed: {'YES' if handoff.get('closed') else 'NO'}",
        f"Next Subsystem: {handoff.get('next_subsystem', 'unknown')}",
    ]

    if update.effective_message:
        await update.effective_message.reply_text("\n".join(lines))
