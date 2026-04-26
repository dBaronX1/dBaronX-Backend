from __future__ import annotations

from fastapi import APIRouter

from crypto.dbx_router_registry import DBX_ROUTER_REGISTRY, include_dbx_routers
from crypto.schemas.dbx_route_schemas import DbxRouteMountInfo, DbxRouteRegistryResponse

router = APIRouter(tags=["internal-dbx-api"])

include_dbx_routers(router)


@router.get("/internal/dbx/routes", response_model=DbxRouteRegistryResponse)
async def dbx_routes() -> DbxRouteRegistryResponse:
    return DbxRouteRegistryResponse(
        success=True,
        routes=[
            DbxRouteMountInfo(
                module=registration.module,
                prefix=registration.prefix,
                tags=list(registration.tags),
                required=registration.required,
            )
            for registration in DBX_ROUTER_REGISTRY
        ],
    )