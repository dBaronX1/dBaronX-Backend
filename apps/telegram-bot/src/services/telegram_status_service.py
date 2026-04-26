from __future__ import annotations

from typing import Any

from services.fastapi_client import FastApiClient
from services.nestjs_client import NestJsClient


class TelegramStatusService:
    def __init__(self) -> None:
        self.nestjs = NestJsClient()
        self.fastapi = FastApiClient()

    async def full_status(self, *, actor_id: str) -> dict[str, Any]:
        launch = await self.nestjs.get_launch_closure(actor_id=actor_id)
        readiness = await self.nestjs.get_readiness_matrix(actor_id=actor_id)
        fastapi = await self.fastapi.get_final_fastapi_subsystem_closure(
            actor_id=actor_id
        )

        launch_closure = launch.get("launchClosure", {})
        readiness_matrix = readiness.get("readinessMatrix", {})
        fastapi_closure = fastapi.get("final_fastapi_subsystem_closure", {})

        return {
            "launch_ready": bool(launch_closure.get("ready")),
            "launch_blockers": launch_closure.get("blockers", []),
            "readiness_matrix": readiness_matrix,
            "fastapi_closed": bool(fastapi_closure.get("closed")),
            "fastapi_blockers": fastapi_closure.get("blockers", []),
        }
