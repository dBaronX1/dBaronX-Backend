from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from formatters.admin_formatters import format_fastapi_closure, format_launch_closure, format_readiness_matrix
from services.fastapi_client import FastApiClient
from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


class SystemHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()
        self.fastapi = FastApiClient()

    async def launch(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_launch_closure(actor_id=actor.telegram_user_id)
        text = format_launch_closure(payload.get("launchClosure", {}))

        if update.effective_message:
            await update.effective_message.reply_text(text)

    async def readiness(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_readiness_matrix(actor_id=actor.telegram_user_id)
        text = format_readiness_matrix(payload)

        if update.effective_message:
            await update.effective_message.reply_text(text)

    async def fastapi(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.fastapi.get_final_fastapi_subsystem_closure(
            actor_id=actor.telegram_user_id
        )
        text = format_fastapi_closure(payload)

        if update.effective_message:
            await update.effective_message.reply_text(text)

    async def platform_admin_pack(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.nestjs.get_system_admin_pack(actor_id=actor.telegram_user_id)
        shell = payload.get("platformAdminPack", {}).get("shell", {})
        summary = payload.get("platformAdminPack", {}).get("summary", {})

        lines = [
            "Platform Admin Pack",
            f"Platform Ready: {'YES' if shell.get('ready') else 'NO'}",
            f"Blockers: {len(shell.get('blockers', []))}",
            f"Sections: {len(summary.keys()) if isinstance(summary, dict) else 0}",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


system_handler_service = SystemHandlerService()


async def system_launch_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await system_handler_service.launch(update, context)


async def system_readiness_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await system_handler_service.readiness(update, context)


async def system_fastapi_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await system_handler_service.fastapi(update, context)


async def system_platform_pack_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await system_handler_service.platform_admin_pack(update, context)
