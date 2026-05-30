from __future__ import annotations

import importlib
import logging
import os
from dataclasses import dataclass
from typing import Any, Literal

from fastapi import APIRouter

logger = logging.getLogger("dbaronx.fastapi.router")

RouteMountStatus = Literal[
    "mounted",
    "skipped_intentionally",
    "missing_optional_module",
    "required_failed",
    "optional_failed",
]


@dataclass(frozen=True)
class RouteMount:
    module_path: str
    router_name: str = "router"
    prefix: str = ""
    tags: tuple[str, ...] = ()
    required: bool = False


@dataclass(frozen=True)
class SkippedRouteMount:
    module_path: str
    prefix: str
    tags: tuple[str, ...]
    reason: str
    owner: str
    required: bool = False


api_router = APIRouter()

ROUTE_MOUNTS: tuple[RouteMount, ...] = (
    RouteMount(
        module_path="crypto.dbx_routes",
        prefix="",
        tags=("internal-dbx",),
        required=True,
    ),
    RouteMount(
        module_path="app.routers.health",
        prefix="",
        tags=("health",),
        required=False,
    ),
    RouteMount(
        module_path="app.api.routes.nestjs_handshake",
        prefix="",
        tags=("nestjs-handshake",),
        required=True,
    ),
    RouteMount(
        module_path="app.api.routes.launch_control_manifest",
        prefix="",
        tags=("launch-control-manifest",),
        required=True,
    ),
    RouteMount(
        module_path="app.api.routes.intelligence_startup_gate",
        prefix="",
        tags=("intelligence-startup-gate",),
        required=True,
    ),
    RouteMount(
        module_path="app.api.routes.runtime_snapshot",
        prefix="",
        tags=("runtime-snapshot",),
        required=True,
    ),
    RouteMount(
        module_path="app.api.routes.fastapi_step1_closure",
        prefix="",
        tags=("fastapi-step1-closure",),
        required=True,
    ),
    RouteMount(
        module_path="app.api.routes.ai_stories",
        prefix="/stories",
        tags=("ai-stories",),
        required=False,
    ),
    RouteMount(
        module_path="app.api.routes.ai_generation",
        prefix="",
        tags=("ai",),
        required=False,
    ),
    RouteMount(
        module_path="app.api.routes.watch_session_anomaly",
        prefix="/watch",
        tags=("watch-to-earn",),
        required=False,
    ),
    RouteMount(
        module_path="app.api.routes.fraud_decision",
        prefix="/fraud",
        tags=("fraud",),
        required=False,
    ),
    RouteMount(
        module_path="app.api.routes.captcha",
        prefix="",
        tags=("captcha",),
        required=True,
    ),
    RouteMount(
        module_path="app.api.routes.first_sale_risk_policy",
        prefix="/first-sale-risk-policy",
        tags=("first-sale-risk-policy",),
        required=False,
    ),
)

# These module paths used to be attempted as optional FastAPI mounts, but they do
# not exist in this service. Wallet and settlement remain owned by the NestJS
# backend unless real FastAPI intelligence routers are added here deliberately.
INTENTIONALLY_SKIPPED_ROUTE_MOUNTS: tuple[SkippedRouteMount, ...] = (
    SkippedRouteMount(
        module_path="src.wallet.routes.wallet",
        prefix="/wallet",
        tags=("wallet",),
        reason="external_nestjs_domain_no_fastapi_router",
        owner="nestjs",
    ),
    SkippedRouteMount(
        module_path="src.settlement.routes.settlement",
        prefix="/settlement",
        tags=("settlement",),
        reason="external_nestjs_domain_no_fastapi_router",
        owner="nestjs",
    ),
)

MOUNTED_ROUTES: list[dict[str, Any]] = []
FAILED_ROUTE_MOUNTS: list[dict[str, Any]] = []
SKIPPED_ROUTE_MOUNTS: list[dict[str, Any]] = []
ROUTE_MOUNT_DIAGNOSTICS: list[dict[str, Any]] = []


def strict_route_mount_enabled() -> bool:
    return os.getenv("FASTAPI_STRICT_ROUTE_MOUNT", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _record_diagnostic(
    *,
    mount: RouteMount | SkippedRouteMount,
    status: RouteMountStatus,
    router_name: str = "router",
    error: str | None = None,
    message: str | None = None,
    reason: str | None = None,
    owner: str | None = None,
) -> dict[str, Any]:
    diagnostic: dict[str, Any] = {
        "module": mount.module_path,
        "router": router_name,
        "prefix": mount.prefix,
        "tags": list(mount.tags),
        "required": mount.required,
        "status": status,
    }
    if error:
        diagnostic["error"] = error
    if message:
        diagnostic["message"] = message
    if reason:
        diagnostic["reason"] = reason
    if owner:
        diagnostic["owner"] = owner

    ROUTE_MOUNT_DIAGNOSTICS.append(diagnostic)
    return diagnostic


def _record_skipped_route(mount: SkippedRouteMount) -> None:
    diagnostic = _record_diagnostic(
        mount=mount,
        status="skipped_intentionally",
        reason=mount.reason,
        owner=mount.owner,
    )
    SKIPPED_ROUTE_MOUNTS.append(diagnostic)
    logger.info(
        "Skipped FastAPI router module=%s reason=%s owner=%s",
        mount.module_path,
        mount.reason,
        mount.owner,
    )


def _mount_route(mount: RouteMount) -> None:
    try:
        module = importlib.import_module(mount.module_path)
        router = getattr(module, mount.router_name)

        api_router.include_router(
            router,
            prefix=mount.prefix,
            tags=list(mount.tags),
        )

        mounted = _record_diagnostic(
            mount=mount,
            status="mounted",
            router_name=mount.router_name,
        )
        MOUNTED_ROUTES.append(mounted)

        logger.info(
            "Mounted FastAPI router module=%s prefix=%s required=%s",
            mount.module_path,
            mount.prefix,
            mount.required,
        )
    except Exception as exc:
        status: RouteMountStatus
        if mount.required:
            status = "required_failed"
        elif isinstance(exc, ModuleNotFoundError):
            status = "missing_optional_module"
        else:
            status = "optional_failed"

        failure = _record_diagnostic(
            mount=mount,
            status=status,
            router_name=mount.router_name,
            error=exc.__class__.__name__,
            message=str(exc),
        )

        FAILED_ROUTE_MOUNTS.append(failure)

        logger.warning(
            "Failed to mount FastAPI router module=%s required=%s status=%s error=%s",
            mount.module_path,
            mount.required,
            status,
            exc,
        )

        if mount.required and strict_route_mount_enabled():
            raise RuntimeError(f"Failed to mount required FastAPI route: {failure}") from exc


for skipped_route_mount in INTENTIONALLY_SKIPPED_ROUTE_MOUNTS:
    _record_skipped_route(skipped_route_mount)

for route_mount in ROUTE_MOUNTS:
    _mount_route(route_mount)


@api_router.get("/health", tags=["health"])
async def api_health() -> dict[str, Any]:
    required_failures = [
        failure for failure in FAILED_ROUTE_MOUNTS if bool(failure.get("required"))
    ]

    return {
        "success": len(required_failures) == 0,
        "service": "dbaronx-fastapi",
        "status": "healthy" if not required_failures else "degraded",
        "mounted_routes": MOUNTED_ROUTES,
        "failed_route_mounts": FAILED_ROUTE_MOUNTS,
        "skipped_route_mounts": SKIPPED_ROUTE_MOUNTS,
        "route_mount_diagnostics": ROUTE_MOUNT_DIAGNOSTICS,
    }


@api_router.get("/health/live", tags=["health"])
async def live_health() -> dict[str, Any]:
    return {
        "success": True,
        "service": "dbaronx-fastapi",
        "status": "live",
    }


@api_router.get("/health/ready", tags=["health"])
async def ready_health() -> dict[str, Any]:
    required_failures = [
        failure for failure in FAILED_ROUTE_MOUNTS if bool(failure.get("required"))
    ]

    return {
        "success": len(required_failures) == 0,
        "service": "dbaronx-fastapi",
        "status": "ready" if not required_failures else "not_ready",
        "required_route_failures": required_failures,
    }


@api_router.get("/mounted-routes", tags=["health"])
async def mounted_routes() -> dict[str, Any]:
    return {
        "success": True,
        "mounted_routes": MOUNTED_ROUTES,
        "failed_route_mounts": FAILED_ROUTE_MOUNTS,
        "skipped_route_mounts": SKIPPED_ROUTE_MOUNTS,
        "route_mount_diagnostics": ROUTE_MOUNT_DIAGNOSTICS,
    }
