from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin
from services.nestjs_client import NestJsClient


class AiStoriesHandlerService:
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
        payload = await self.nestjs.get_system_admin_pack(actor_id=actor.telegram_user_id)
        summary = payload.get("platformAdminPack", {}).get("summary", {})
        ai_stories = summary.get("aiStories", {})

        lines = [
            "AI Stories Ops",
            f"Total campaigns: {ai_stories.get('totalCampaigns', 0)}",
            f"Total stories: {ai_stories.get('totalStories', 0)}",
            f"Campaign status counts: {ai_stories.get('campaignStatusCounts', {})}",
            "",
            "Primary review queue:",
            "/ai_queue",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def distribution_help(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        lines = [
            "AI Stories Distribution Ops",
            "Primary internal distribution endpoint:",
            "/api/v1/ai-stories/distribution-pack/:campaignId",
            "",
            "Current Telegram surface provides monitoring and queue visibility.",
        ]

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


ai_stories_handler_service = AiStoriesHandlerService()


async def ai_stories_ops_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await ai_stories_handler_service.overview(update, context)


async def ai_stories_distribution_help_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    await ai_stories_handler_service.distribution_help(update, context)
