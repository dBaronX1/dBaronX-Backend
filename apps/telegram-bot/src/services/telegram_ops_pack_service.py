from __future__ import annotations

from typing import Any

from services.fastapi_client import FastApiClient
from services.nestjs_client import NestJsClient


class TelegramOpsPackService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()
        self.fastapi = FastApiClient()

    async def build(self, *, actor_id: str) -> dict[str, Any]:
        nest_pack = await self.nestjs.get_system_admin_pack(actor_id=actor_id)
        launch = await self.nestjs.get_launch_closure(actor_id=actor_id)
        fastapi = await self.fastapi.get_fastapi_handoff_pack(actor_id=actor_id)

        return {
            "platform_admin_pack": nest_pack.get("platformAdminPack", {}),
            "launch_closure": launch.get("launchClosure", {}),
            "fastapi_handoff_pack": fastapi.get("fastapi_handoff_pack", {}),
        }
