from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from services.fastapi_client import FastApiClient
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin


class FastApiHandlerService:
    def __init__(self) -> None:
        self.fastapi = FastApiClient()

    async def handoff_pack(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.fastapi.get_fastapi_handoff_pack(
            actor_id=actor.telegram_user_id
        )
        handoff = payload.get("fastapi_handoff_pack", {})

        lines = [
            "FastAPI Handoff Pack",
            f"Closed: {'YES' if handoff.get('closed') else 'NO'}",
            f"Next Subsystem: {handoff.get('next_subsystem', 'unknown')}",
            f"Recommended Consumers: {len(handoff.get('recommended_consumers', []))}",
        ]
        for item in handoff.get("recommended_consumers", [])[:10]:
            lines.append(f"- {item}")

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def route_family_matrix(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.fastapi.get_internal_route_family_matrix(
            actor_id=actor.telegram_user_id
        )
        matrix = payload.get("internal_route_family_matrix", {}).get("matrix", [])

        lines = [
            "FastAPI Internal Route Family Matrix",
            f"Families: {len(matrix)}",
        ]
        for item in matrix[:10]:
            lines.append(
                f"- {item.get('prefix')} | protected={item.get('declared_protected')} | bound={item.get('correctly_bound')}"
            )

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))

    async def enforcement_sweep(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        if not await require_admin(update, context):
            return

        actor = build_actor_context(update)
        payload = await self.fastapi.get_final_enforcement_sweep(
            actor_id=actor.telegram_user_id
        )
        sweep = payload.get("final_enforcement_sweep", {})

        blockers = sweep.get("blockers", [])
        lines = [
            "FastAPI Final Enforcement Sweep",
            f"Closed: {'YES' if sweep.get('closed') else 'NO'}",
            f"Blockers: {len(blockers)}",
        ]
        for item in blockers[:12]:
            lines.append(f"- {item}")

        if update.effective_message:
            await update.effective_message.reply_text("\n".join(lines))


fastapi_handler_service = FastApiHandlerService()


async def fastapi_handoff_pack_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    await fastapi_handler_service.handoff_pack(update, context)


async def fastapi_route_family_matrix_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    await fastapi_handler_service.route_family_matrix(update, context)


async def fastapi_enforcement_sweep_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    await fastapi_handler_service.enforcement_sweep(update, context)
