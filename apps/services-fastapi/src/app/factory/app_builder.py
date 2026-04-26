from __future__ import annotations

from fastapi import FastAPI

from app.config.settings import FastApiSettings, get_fastapi_settings
from app.docs.openapi_policy import OpenApiPolicy
from app.factory.exception_installer import ExceptionInstaller
from app.factory.middleware_installer import MiddlewareInstaller
from app.factory.router_installer import RouterInstaller
from app.lifespan.lifespan_manager import build_lifespan
from app.runtime.app_metadata import AppMetadata


class FastApiAppBuilder:
    def __init__(self, settings: FastApiSettings | None = None) -> None:
        self.settings = settings or get_fastapi_settings()
        self.metadata = AppMetadata.from_settings(self.settings)
        self.openapi_policy = OpenApiPolicy(self.settings)

    def build(self) -> FastAPI:
        app = FastAPI(
            title=self.metadata.title,
            description=self.metadata.description,
            version=self.metadata.version,
            docs_url=self.openapi_policy.docs_url,
            redoc_url=self.openapi_policy.redoc_url,
            openapi_url=self.openapi_policy.openapi_url,
            lifespan=build_lifespan(self.settings),
        )

        app.state.service_name = self.metadata.service_name
        app.state.app_env = self.metadata.environment
        app.state.app_version = self.metadata.version
        app.state.boot_ok = False

        MiddlewareInstaller(self.settings).install(app)
        ExceptionInstaller().install(app)
        RouterInstaller(self.settings).install(app)

        app.state.boot_ok = True

        return app


def build_app(settings: FastApiSettings | None = None) -> FastAPI:
    return FastApiAppBuilder(settings).build()