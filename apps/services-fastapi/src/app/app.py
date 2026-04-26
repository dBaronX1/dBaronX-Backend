from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.middleware.error_handlers import register_exception_handlers
from app.middleware.request_context import request_context_middleware
from app.routers.health import router as health_router


def create_app() -> FastAPI:
    settings: Settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_url=settings.openapi_url,
        default_response_class=None,
    )

    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=[
                "Authorization",
                "Content-Type",
                "x-request-id",
                "x-forwarded-for",
                "user-agent",
            ],
            expose_headers=["x-request-id", "x-process-time-ms"],
            max_age=86400,
        )

    app.middleware("http")(request_context_middleware)
    register_exception_handlers(app)

    app.include_router(health_router)

    return app
