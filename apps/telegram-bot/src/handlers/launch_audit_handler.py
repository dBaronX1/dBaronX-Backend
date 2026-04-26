from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


nestjs_client = NestJsClient()


async def launch_audit_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    if not await require_admin(update, context):
        return

    actor = build_actor_context(update)
    payload = await nestjs_client.get_launch_closure(actor_id=actor.telegram_user_id)
    closure = payload.get("launchClosure", {})

    blockers = closure.get("blockers", [])
    lines = [
        "Launch Audit Trail",
        f"Ready: {'YES' if closure.get('ready') else 'NO'}",
        f"Blockers: {len(blockers)}",
    ]
    if blockers:
        lines.append("Top blockers:")
        lines.extend(f"- {item}" for item in blockers[:12])

    if update.effective_message:
        await update.effective_message.reply_text("\n".join(lines))
