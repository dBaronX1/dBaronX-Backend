from __future__ import annotations

from dataclasses import dataclass

from fastapi import APIRouter

from crypto.routes.dbx_diagnostics_routes import router as diagnostics_router
from crypto.routes.dbx_health_routes import router as health_router
from crypto.routes.dbx_internal_routes import router as internal_router


@dataclass(frozen=True)
class DbxRouterRegistration:
    router: APIRouter
    module: str
    prefix: str
    tags: tuple[str, ...]
    required: bool = True


DBX_ROUTER_REGISTRY: tuple[DbxRouterRegistration, ...] = (
    DbxRouterRegistration(
        router=internal_router,
        module="crypto.routes.dbx_internal_routes",
        prefix="/internal/dbx",
        tags=("internal-dbx-v2",),
        required=True,
    ),
    DbxRouterRegistration(
        router=health_router,
        module="crypto.routes.dbx_health_routes",
        prefix="/internal/dbx",
        tags=("internal-dbx-health",),
        required=True,
    ),
    DbxRouterRegistration(
        router=diagnostics_router,
        module="crypto.routes.dbx_diagnostics_routes",
        prefix="/internal/dbx",
        tags=("internal-dbx-diagnostics",),
        required=True,
    ),
)


def include_dbx_routers(target: APIRouter) -> None:
    for registration in DBX_ROUTER_REGISTRY:
        target.include_router(registration.router)