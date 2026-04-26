from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api_router import FAILED_ROUTE_MOUNTS, MOUNTED_ROUTES, api_router

logger = logging.getLogger("dbaronx.fastapi.app_factory")


def _split_csv(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default

    parsed = [item.strip() for item in value.split(",") if item.strip()]
    return parsed or default


def _bool_env(key: str, default: bool = False) -> bool:
    raw = os.getenv(key)

    if raw is None:
        return default

    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _app_env() -> str:
    return (
        os.getenv("APP_ENV")
        or os.getenv("ENVIRONMENT")
        or os.getenv("NODE_ENV")
        or "development"
    ).strip().lower()


def _is_production() -> bool:
    return _app_env() == "production"


def _docs_enabled() -> bool:
    return not _bool_env("DISABLE_DOCS", default=False)


def _strict_route_mount_enabled() -> bool:
    return _bool_env("FASTAPI_STRICT_ROUTE_MOUNT", default=True)


def _internal_token_required() -> bool:
    return _bool_env("FASTAPI_REQUIRE_INTERNAL_TOKEN", default=True)


def _validate_startup_security() -> None:
    internal_token = (
        os.getenv("INTERNAL_SERVICE_TOKEN")
        or os.getenv("FASTAPI_INTERNAL_SERVICE_TOKEN")
        or ""
    ).strip()

    if _internal_token_required() and not internal_token:
        raise RuntimeError(
            "INTERNAL_SERVICE_TOKEN is required for protected FastAPI internal endpoints."
        )

    if _is_production() and len(internal_token) < 20:
        raise RuntimeError(
            "INTERNAL_SERVICE_TOKEN must be at least 20 characters in production."
        )


def _load_request_context_middleware() -> type[Any] | None:
    candidates = (
        "app.middleware.request_context",
        "src.app.middleware.request_context",
        "src.middleware.request_context",
        "middleware.request_context",
    )

    for module_path in candidates:
        try:
            module = __import__(module_path, fromlist=["RequestContextMiddleware"])
            return getattr(module, "RequestContextMiddleware")
        except Exception:
            continue

    return None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    _validate_startup_security()

    required_failures = [
        failure for failure in FAILED_ROUTE_MOUNTS if bool(failure.get("required"))
    ]

    if required_failures and _strict_route_mount_enabled():
        raise RuntimeError(
            f"FastAPI boot blocked by failed required route mounts: {required_failures}"
        )

    app.state.service_name = os.getenv("APP_NAME", "dbaronx-fastapi")
    app.state.app_env = _app_env()
    app.state.app_version = os.getenv("APP_VERSION", "1.0.0")
    app.state.boot_ok = len(required_failures) == 0
    app.state.mounted_routes = MOUNTED_ROUTES
    app.state.failed_route_mounts = FAILED_ROUTE_MOUNTS

    logger.info(
        "FastAPI boot complete service=%s env=%s mounted_routes=%s failed_mounts=%s",
        app.state.service_name,
        app.state.app_env,
        len(MOUNTED_ROUTES),
        len(FAILED_ROUTE_MOUNTS),
    )

    yield


def create_app() -> FastAPI:
    production = _is_production()
    docs_enabled = _docs_enabled() and not production

    app = FastAPI(
        title=os.getenv("APP_NAME", "dBaronX FastAPI Intelligence"),
        version=os.getenv("APP_VERSION", "1.0.0"),
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_split_csv(
            os.getenv("CORS_ORIGINS"),
            [
                "https://dbaronx.com",
                "https://www.dbaronx.com",
                "http://localhost:3000",
                "http://localhost:3001",
            ],
        ),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-Id",
            "X-Actor-Id",
            "X-Internal-Token",
            "X-Internal-Service-Token",
            "X-Service-Token",
            "X-Service-Name",
        ],
        expose_headers=["X-Request-Id"],
        max_age=600,
    )

    request_context_middleware = _load_request_context_middleware()
    if request_context_middleware is not None:
        app.add_middleware(request_context_middleware)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "REQUEST_VALIDATION_ERROR",
                    "message": "Request validation failed.",
                    "details": exc.errors(),
                },
                "meta": {
                    "request_id": getattr(request.state, "request_id", "")
                    or request.headers.get("x-request-id", ""),
                },
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception(
            "Unhandled FastAPI error path=%s request_id=%s",
            request.url.path,
            request.headers.get("x-request-id", ""),
        )

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "Internal server error.",
                    "details": None
                    if production
                    else {
                        "type": exc.__class__.__name__,
                        "message": str(exc),
                    },
                },
                "meta": {
                    "request_id": getattr(request.state, "request_id", "")
                    or request.headers.get("x-request-id", ""),
                },
            },
        )

    @app.get("/")
    async def root() -> dict[str, Any]:
        return {
            "success": True,
            "message": "dBaronX FastAPI intelligence layer",
            "data": {
                "service": os.getenv("APP_NAME", "dbaronx-fastapi"),
                "env": _app_env(),
                "version": os.getenv("APP_VERSION", "1.0.0"),
                "mounted_routes": len(MOUNTED_ROUTES),
                "failed_route_mounts": FAILED_ROUTE_MOUNTS,
            },
            "meta": {},
        }

    app.include_router(api_router)

    return app
