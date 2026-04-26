from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin
from services.nestjs_client import NestJsClient


class PlatformHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()

    async def shell(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_system_admin_pack(actor_id=actor.telegram_user_id)
        shell = payload.get("platformAdminPack", {}).get("shell", {})

        lines = [
            "Platform Shell",
            f"Ready: {'YES' if shell.get('ready') else 'NO'}",
            f"Blockers: {len(shell.get('blockers', []))}",
        ]

        for blocker in shell.get("blockers", [])[:8]:
            lines.append(f"- {blocker}")

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


platform_handler_service = PlatformHandlerService()


async def platform_shell_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await platform_handler_service.shell(update, context)
