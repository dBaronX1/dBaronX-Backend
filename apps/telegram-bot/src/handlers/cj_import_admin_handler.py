from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.nestjs_client import NestJsClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


async def _reply(update: Update, text: str) -> None:
    if update.effective_message:
        await update.effective_message.reply_text(text)


async def cj_import_preview_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    actor = build_actor_context(update)
    args = context.args or []
    category = args[0] if args else "all"
    limit = int(args[1]) if len(args) > 1 and str(args[1]).isdigit() else 10
    payload = await NestJsClient().cj_import_preview(category=category, limit=limit, actor_id=actor.telegram_user_id)
    await _reply(update, f"preview: items={len(payload.get('items', []))} category={category} limit={limit}")


async def cj_import_run_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context): return
    actor = build_actor_context(update)
    args = context.args or []
    category = args[0] if args else "all"
    limit = int(args[1]) if len(args) > 1 and str(args[1]).isdigit() else 10
    payload = await NestJsClient().cj_import_run(category=category, limit=limit, actor_id=actor.telegram_user_id)
    await _reply(update, f"run: imported={payload.get('imported', 0)} accepted={payload.get('accepted', 0)} rejected={payload.get('rejected', 0)}")

async def cj_import_status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context): return
    actor = build_actor_context(update)
    runs = await NestJsClient().cj_import_runs(actor_id=actor.telegram_user_id)
    items = await NestJsClient().cj_import_items(actor_id=actor.telegram_user_id)
    await _reply(update, f"status: runs={len(runs.get('data', []))} pending_approval={len([i for i in items.get('data', []) if i.get('approval_status')=='pending_admin_approval'])}")

async def cj_import_approve_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context): return
    if not context.args: return await _reply(update, "usage: /cj_import_approve <item_id>")
    actor = build_actor_context(update)
    payload = await NestJsClient().cj_import_approve(item_id=context.args[0], actor_id=actor.telegram_user_id)
    await _reply(update, f"approved: {payload.get('data', {}).get('id', context.args[0])}")

async def cj_import_reject_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context): return
    if not context.args: return await _reply(update, "usage: /cj_import_reject <item_id>")
    actor = build_actor_context(update)
    payload = await NestJsClient().cj_import_reject(item_id=context.args[0], actor_id=actor.telegram_user_id)
    await _reply(update, f"rejected: {payload.get('data', {}).get('id', context.args[0])}")

async def cj_publish_approved_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context): return
    actor = build_actor_context(update)
    payload = await NestJsClient().cj_publish_approved(actor_id=actor.telegram_user_id)
    await _reply(update, f"published={payload.get('published', 0)}")
