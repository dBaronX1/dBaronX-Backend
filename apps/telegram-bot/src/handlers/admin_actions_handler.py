from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


class AdminActionsHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()

    async def action_pack(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_system_admin_actions_pack(
            actor_id=actor.telegram_user_id
        )
        pack = payload.get("adminActionPack", {})

        lines = [
            "Admin Action Pack",
            f"Supported Actions: {len(pack.get('supportedActions', []))}",
        ]
        for item in pack.get("supportedActions", []):
            lines.append(f"- {item}")

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def recheck_help(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        lines = [
            "Admin Recheck Action",
            "Authoritative internal endpoint:",
            "/api/v1/system/admin-actions/recheck-all",
            "",
            "Direct Telegram mutation command can be enabled after execution safeguards are approved.",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


admin_actions_handler_service = AdminActionsHandlerService()


async def admin_action_pack_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    await admin_actions_handler_service.action_pack(update, context)


async def admin_recheck_help_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    await admin_actions_handler_service.recheck_help(update, context)
