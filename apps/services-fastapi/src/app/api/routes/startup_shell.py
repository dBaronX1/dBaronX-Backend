from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.startup_shell import StartupShellResponse
from app.services.startup_shell_service import StartupShellService

router = APIRouter(
    prefix="/startup-shell",
    tags=["startup-shell"],
)


def startup_shell_service_dep() -> StartupShellService:
    return StartupShellService()


@router.get("/snapshot", response_model=StartupShellResponse)
async def get_startup_shell_snapshot(
    service: StartupShellService = Depends(startup_shell_service_dep),
):
    result = service.build()
    return StartupShellResponse(**result)
