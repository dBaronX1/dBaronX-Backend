from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin
from services.nestjs_client import NestJsClient


class WatchHandlerService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()

    async def reward_decision_help(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        lines = [
            "Watch Reward Ops",
            "Use NestJS internal watch orchestration endpoint for authoritative decisions:",
            "/api/v1/watch/orchestration/reward-decision",
            "",
            "Telegram command surface here is operational/read-only in this phase.",
            "Next step is full watch review + retry + session investigation commands.",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def overview(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        pack = await self.nestjs.get_system_admin_pack(actor_id=actor.telegram_user_id)
        shell = pack.get("platformAdminPack", {}).get("shell", {})
        blockers = shell.get("blockers", [])

        lines = [
            "Watch-to-Earn Control Surface",
            f"Platform Ready: {'YES' if shell.get('ready') else 'NO'}",
            f"Known Blockers: {len(blockers)}",
            "Primary intelligence owner: FastAPI",
            "Primary economic owner: NestJS",
        ]
        if blockers:
            lines.append("Top blockers:")
            lines.extend(f"- {item}" for item in blockers[:5])

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


watch_handler_service = WatchHandlerService()


async def watch_ops_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await watch_handler_service.overview(update, context)


async def watch_reward_help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await watch_handler_service.reward_decision_help(update, context)
